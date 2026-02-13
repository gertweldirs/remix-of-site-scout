const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function browserHeaders(referer: string): Record<string, string> {
  const origin = new URL(referer).origin;
  return {
    'User-Agent': randomUA(),
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': referer,
    'Origin': origin,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Ch-Ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
  };
}

async function fetchWithRetry(url: string, referer: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url, {
      headers: browserHeaders(referer),
      redirect: 'follow',
    });
    if (resp.ok) return resp;
    if (i < retries) {
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    } else {
      return resp; // Return last failed response
    }
  }
  throw new Error('Unreachable');
}

async function fetchViaFirecrawl(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;

  try {
    console.log('Trying Firecrawl for:', url.substring(0, 80));
    const fcResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['rawHtml'],
        waitFor: 5000,
      }),
    });

    if (fcResp.ok) {
      const fcData = await fcResp.json();
      const raw = fcData.data?.rawHtml || fcData.data?.html || null;
      // For m3u8 files, the rawHtml might contain the playlist text
      // Also check markdown which might have the raw content
      if (!raw && fcData.data?.markdown) return fcData.data.markdown;
      return raw;
    }
  } catch (err) {
    console.error('Firecrawl error:', err);
  }
  return null;
}

// Directly fetch m3u8 content via Firecrawl headless browser
async function fetchM3u8ViaFirecrawl(m3u8Url: string, referer: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;

  try {
    // Firecrawl can render pages with a headless browser, bypassing Cloudflare
    // For m3u8 we need to get the raw content, so we'll scrape the referer page
    // and extract the video player's actual working m3u8 content
    console.log('Fetching m3u8 via Firecrawl headless browser, referer:', referer);

    // Strategy: Use Firecrawl to load the original page with actions to extract
    // the video source. Since m3u8 URLs are generated client-side with signatures,
    // we need the headless browser to execute JavaScript and capture the URLs.
    const fcResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: referer,
        formats: ['rawHtml'],
        waitFor: 5000,
        // Ask Firecrawl to wait for video elements to be loaded
        actions: [
          { type: 'wait', milliseconds: 3000 },
        ],
      }),
    });

    if (fcResp.ok) {
      const fcData = await fcResp.json();
      const html = fcData.data?.rawHtml || '';

      // Extract m3u8 URLs from the rendered HTML
      const m3u8Regex = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g;
      const matches = html.match(m3u8Regex);
      if (matches && matches.length > 0) {
        // Find the video ID from the original URL
        const videoIdMatch = m3u8Url.match(/m3u8\/(\d+)\.m3u8/);
        const videoId = videoIdMatch?.[1];

        let freshUrl = matches[0];
        if (videoId) {
          const matchingUrl = matches.find((m: string) => m.includes(videoId));
          if (matchingUrl) freshUrl = matchingUrl;
        }

        // Clean up any HTML entities
        freshUrl = freshUrl.replace(/&amp;/g, '&');

        console.log('Found fresh m3u8 URL from page:', freshUrl.substring(0, 80));

        // Now fetch this fresh URL with proper referer
        const resp = await fetchWithRetry(freshUrl, referer, 2);
        if (resp.ok) {
          return await resp.text();
        }
        console.log('Fresh m3u8 URL still returned:', resp.status);
      } else {
        console.log('No m3u8 URLs found in rendered HTML');
        // Try to find encoded video data (data-video attributes, etc.)
        const dataVideoRegex = /data-video="([^"]+)"/g;
        let match;
        while ((match = dataVideoRegex.exec(html)) !== null) {
          try {
            // Try to decode the data-video attribute
            const decoded = atob(match[1].split('').reverse().join(''));
            if (decoded.includes('.m3u8')) {
              const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
              if (urlMatch) {
                const freshUrl = urlMatch[0].replace(/&amp;/g, '&');
                console.log('Found m3u8 from data-video:', freshUrl.substring(0, 80));
                const resp = await fetchWithRetry(freshUrl, referer, 2);
                if (resp.ok) return await resp.text();
              }
            }
          } catch { /* decode failed */ }
        }
      }
    }
  } catch (err) {
    console.error('Firecrawl m3u8 error:', err);
  }
  return null;
}

Deno.serve(async (req) => {
  // Handle GET requests for proxied HLS segments
  if (req.method === 'GET') {
    const reqUrl = new URL(req.url);
    const targetUrl = reqUrl.searchParams.get('url');
    const ref = reqUrl.searchParams.get('ref');

    if (targetUrl) {
      try {
        const referer = ref || new URL(targetUrl).origin + '/';
        console.log('Proxying segment:', targetUrl.substring(0, 80));

        const resp = await fetchWithRetry(targetUrl, referer);
        if (!resp.ok) {
          console.log('Segment fetch failed:', resp.status);
          return new Response('Segment fetch failed', {
            status: resp.status,
            headers: corsHeaders,
          });
        }

        const contentType = resp.headers.get('content-type') || 'video/mp2t';
        const body = await resp.arrayBuffer();

        return new Response(body, {
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (segErr) {
        console.error('Segment proxy error:', segErr);
        return new Response(JSON.stringify({ error: String(segErr) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    // No url param - return 400
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, refererUrl, proxySegments } = await req.json() as {
      url: string;
      refererUrl?: string;
      proxySegments?: boolean;
    };

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const referer = refererUrl || new URL(url).origin + '/';
    const isM3u8 = url.includes('.m3u8');

    console.log('Proxying:', url.substring(0, 100), 'referer:', referer, 'isM3u8:', isM3u8);

    // First attempt: direct fetch
    let resp = await fetchWithRetry(url, referer, 1);

    // If 403 and it's m3u8, use Firecrawl headless browser to get fresh content
    if (!resp.ok && resp.status === 403 && isM3u8) {
      console.log('Direct m3u8 fetch got 403, using Firecrawl headless browser');
      const m3u8Content = await fetchM3u8ViaFirecrawl(url, referer);
      if (m3u8Content && (m3u8Content.includes('#EXTM3U') || m3u8Content.includes('#EXT-X'))) {
        console.log('Got m3u8 content via Firecrawl, length:', m3u8Content.length);
        
        if (proxySegments) {
          // Rewrite segment URLs in the manifest
          const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
          const reqUrl2 = new URL(req.url);
          const proxyBase = `${reqUrl2.origin}${reqUrl2.pathname}`;

          const rewrittenManifest = m3u8Content.split('\n').map(line => {
            const trimmed = line.trim();
            if (trimmed === '') return line;
            if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/, (_m, uri) => {
                const abs = uri.startsWith('http') ? uri : baseUrl + uri;
                return `URI="${proxyBase}?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)}"`;
              });
            }
            if (trimmed.startsWith('#')) return line;
            const segUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
            return `${proxyBase}?url=${encodeURIComponent(segUrl)}&ref=${encodeURIComponent(referer)}`;
          }).join('\n');

          return new Response(rewrittenManifest, {
            headers: { ...corsHeaders, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache' },
          });
        }

        return new Response(m3u8Content, {
          headers: { ...corsHeaders, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache' },
        });
      }
    }

    // If still 403 for non-m3u8, try Firecrawl redirect detection
    if (!resp.ok && resp.status === 403 && !isM3u8) {
      const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (apiKey) {
        console.log('Trying Firecrawl redirect detection for:', url.substring(0, 80));
        try {
          const fcResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, formats: ['rawHtml'], waitFor: 3000 }),
          });
          if (fcResp.ok) {
            const fcData = await fcResp.json();
            const finalUrl = fcData.data?.metadata?.sourceURL || fcData.data?.metadata?.url;
            if (finalUrl && finalUrl !== url) {
              console.log('Firecrawl found redirect to:', finalUrl);
              resp = await fetchWithRetry(finalUrl, referer, 1);
            }
          }
        } catch { /* Firecrawl failed */ }
      }
    }

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch: ${resp.status}` }), {
        status: resp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For m3u8 with proxySegments: rewrite the manifest
    if (isM3u8 && proxySegments) {
      const manifestText = await resp.text();
      const actualUrl = resp.url || url; // Use final URL after redirects
      const baseUrl = actualUrl.substring(0, actualUrl.lastIndexOf('/') + 1);

      // Build the proxy base URL
      const reqUrl = new URL(req.url);
      const proxyBase = `${reqUrl.origin}${reqUrl.pathname}`;

      const rewrittenLines = manifestText.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed === '') return line;

        // Handle URI= in tags like #EXT-X-KEY, #EXT-X-MAP
        if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/, (_match, uri) => {
            const absoluteUri = uri.startsWith('http') ? uri : baseUrl + uri;
            return `URI="${proxyBase}?url=${encodeURIComponent(absoluteUri)}&ref=${encodeURIComponent(referer)}"`;
          });
        }

        // Skip other comments
        if (trimmed.startsWith('#')) return line;

        // This is a segment URL
        const segmentUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
        return `${proxyBase}?url=${encodeURIComponent(segmentUrl)}&ref=${encodeURIComponent(referer)}`;
      });

      const rewrittenManifest = rewrittenLines.join('\n');
      console.log('Rewrote m3u8 manifest successfully, segments:', rewrittenLines.filter(l => !l.trim().startsWith('#') && l.trim() !== '').length);

      return new Response(rewrittenManifest, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // For regular content, return as binary
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const contentLength = resp.headers.get('content-length');
    const body = await resp.arrayBuffer();

    const filename = url.split('/').pop()?.split('?')[0] || 'download';

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
    };
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    return new Response(body, { headers: responseHeaders });
  } catch (e) {
    console.error('media-proxy error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
