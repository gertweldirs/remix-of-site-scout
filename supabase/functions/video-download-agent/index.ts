const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function browserHeaders(referer: string): Record<string, string> {
  const origin = new URL(referer).origin;
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': referer,
    'Origin': origin,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

/**
 * Video Download Agent
 * 
 * Strategy:
 * 1. Use Firecrawl headless browser to load the page containing the video
 * 2. Extract fresh m3u8 URLs with valid signed tokens from rendered HTML
 * 3. Fetch the m3u8 manifest using those fresh URLs
 * 4. Download all TS segments and concatenate them into a single binary
 * 5. Return the combined video as a downloadable blob
 * 
 * Limitations: Edge function timeout (~60s), so large videos may not complete.
 * In that case, we return the fresh m3u8 URL so the client can use VLC/ffmpeg.
 */

interface DownloadRequest {
  pageUrl: string;       // The page that contains the video player
  streamUrl?: string;    // The m3u8 URL (may have expired tokens)
  mode: 'download' | 'fresh-url';  // download = get binary, fresh-url = just get a working URL
}

async function extractFreshM3u8Urls(pageUrl: string): Promise<string[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  console.log('Agent: Loading page with headless browser:', pageUrl);

  const fcResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: pageUrl,
      formats: ['rawHtml'],
      waitFor: 8000,
      actions: [
        { type: 'wait', milliseconds: 5000 },
      ],
    }),
  });

  if (!fcResp.ok) {
    const err = await fcResp.text();
    throw new Error(`Firecrawl error ${fcResp.status}: ${err}`);
  }

  const fcData = await fcResp.json();
  const html = fcData.data?.rawHtml || '';

  // Extract all m3u8 URLs from rendered HTML
  const m3u8Regex = /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/g;
  const rawMatches = html.match(m3u8Regex) || [];

  // Also check for encoded video data
  const dataVideoRegex = /data-video="([^"]+)"/g;
  let match;
  while ((match = dataVideoRegex.exec(html)) !== null) {
    try {
      const decoded = atob(match[1].split('').reverse().join(''));
      const urlMatches = decoded.match(m3u8Regex) || [];
      rawMatches.push(...urlMatches);
    } catch { /* decode failed */ }
  }

  // Also look in script tags for video source assignments
  const srcRegex = /(?:source|src|file|url)\s*[:=]\s*["']?(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/gi;
  let srcMatch;
  while ((srcMatch = srcRegex.exec(html)) !== null) {
    rawMatches.push(srcMatch[1]);
  }

  // Deduplicate and clean
  const unique = [...new Set(rawMatches.map(u => u.replace(/&amp;/g, '&').replace(/\\u0026/g, '&')))];
  console.log(`Agent: Found ${unique.length} m3u8 URLs in rendered page`);
  return unique;
}

async function fetchM3u8Manifest(m3u8Url: string, referer: string): Promise<string | null> {
  try {
    const resp = await fetch(m3u8Url, {
      headers: browserHeaders(referer),
      redirect: 'follow',
    });
    if (resp.ok) {
      const text = await resp.text();
      if (text.includes('#EXTM3U')) return text;
    }
    console.log(`Agent: m3u8 fetch returned ${resp.status}`);
  } catch (e) {
    console.error('Agent: m3u8 fetch error:', e);
  }
  return null;
}

async function downloadSegments(manifest: string, baseUrl: string, referer: string): Promise<{ data: Uint8Array; segCount: number } | null> {
  const lines = manifest.split('\n');
  const segmentUrls: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const segUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
      segmentUrls.push(segUrl);
    }
  }

  // Check if this is a master playlist (contains other m3u8 references)
  const isMaster = segmentUrls.some(u => u.includes('.m3u8'));
  if (isMaster) {
    // Find the highest quality variant
    let bestUrl = segmentUrls[segmentUrls.length - 1]; // Usually last = highest quality
    console.log(`Agent: Master playlist detected, picking variant: ${bestUrl.substring(0, 80)}`);

    const variantManifest = await fetchM3u8Manifest(bestUrl, referer);
    if (!variantManifest) return null;

    const variantBase = bestUrl.substring(0, bestUrl.lastIndexOf('/') + 1);
    return downloadSegments(variantManifest, variantBase, referer);
  }

  console.log(`Agent: Downloading ${segmentUrls.length} segments...`);

  if (segmentUrls.length > 200) {
    console.log('Agent: Too many segments (>200), aborting download to avoid timeout');
    return null;
  }

  const chunks: Uint8Array[] = [];
  let downloaded = 0;

  // Download in batches of 5
  for (let i = 0; i < segmentUrls.length; i += 5) {
    const batch = segmentUrls.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const resp = await fetch(url, {
          headers: browserHeaders(referer),
          redirect: 'follow',
        });
        if (!resp.ok) throw new Error(`Segment ${resp.status}`);
        return new Uint8Array(await resp.arrayBuffer());
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        chunks.push(r.value);
        downloaded++;
      }
    }
  }

  if (downloaded === 0) return null;

  // Concatenate all chunks
  const totalSize = chunks.reduce((s, c) => s + c.length, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  console.log(`Agent: Downloaded ${downloaded}/${segmentUrls.length} segments, total ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
  return { data: combined, segCount: downloaded };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageUrl, streamUrl, mode = 'fresh-url' } = await req.json() as DownloadRequest;

    if (!pageUrl) {
      return new Response(JSON.stringify({ error: 'pageUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const referer = new URL(pageUrl).origin + '/';

    // Step 1: Extract fresh m3u8 URLs from the page
    const freshUrls = await extractFreshM3u8Urls(pageUrl);

    if (freshUrls.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No video streams found on the page',
        fallback: 'browser',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to match original stream URL if provided
    let bestUrl = freshUrls[0];
    if (streamUrl) {
      const videoIdMatch = streamUrl.match(/\/(\d+)\.m3u8/);
      const videoId = videoIdMatch?.[1];
      if (videoId) {
        const matching = freshUrls.find(u => u.includes(videoId));
        if (matching) bestUrl = matching;
      }
    }

    // Step 2: Fetch the manifest to validate it works
    const manifest = await fetchM3u8Manifest(bestUrl, referer);

    if (!manifest) {
      // URLs found but can't fetch - return them for VLC/ffmpeg
      return new Response(JSON.stringify({
        success: true,
        mode: 'urls-only',
        urls: freshUrls,
        message: 'Found stream URLs but could not fetch manifest. Use these in VLC or ffmpeg.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If mode is fresh-url, just return the working URL
    if (mode === 'fresh-url') {
      return new Response(JSON.stringify({
        success: true,
        mode: 'fresh-url',
        url: bestUrl,
        allUrls: freshUrls,
        message: 'Fresh stream URL ready. Use in VLC: File > Open Network Stream',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Download mode - get all segments
    const baseUrl = bestUrl.substring(0, bestUrl.lastIndexOf('/') + 1);
    const result = await downloadSegments(manifest, baseUrl, referer);

    if (!result) {
      // Too many segments or download failed - return URL instead
      return new Response(JSON.stringify({
        success: true,
        mode: 'fresh-url',
        url: bestUrl,
        allUrls: freshUrls,
        message: 'Video too large for direct download. Use this URL in VLC or ffmpeg.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the concatenated video binary
    return new Response(result.data, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'video/mp2t',
        'Content-Disposition': `attachment; filename="video-${Date.now()}.ts"`,
        'Content-Length': String(result.data.length),
        'X-Segments-Downloaded': String(result.segCount),
      },
    });
  } catch (e) {
    console.error('Video download agent error:', e);
    return new Response(JSON.stringify({
      success: false,
      error: String(e),
      fallback: 'browser',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
