const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
  alt?: string;
  poster?: string;
  sourceTag: string;
  foundOn: string;
}

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|tiff?)(\?|$)/i;
const VIDEO_EXTS = /\.(mp4|webm|ogg|mov|avi|mkv|m3u8)(\?|$)/i;
const AUDIO_EXTS = /\.(mp3|wav|flac|aac|ogg|m4a|wma)(\?|$)/i;

function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

// Common user agents to rotate through for sites that block bots
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENTS[i % USER_AGENTS.length],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': new URL(url).origin + '/',
        },
        redirect: 'follow',
      });
      if (resp.ok) return resp;
      // If we get a 403/429, try again with different UA
      if (resp.status === 403 || resp.status === 429) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      return resp;
    } catch (e) {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

async function extractMedia(pageUrl: string): Promise<MediaItem[]> {
  const media: MediaItem[] = [];
  const seen = new Set<string>();

  try {
    const resp = await fetchWithRetry(pageUrl);
    if (!resp || !resp.ok) return media;

    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return media;

    const html = await resp.text();

    const addItem = (url: string | null, type: MediaItem['type'], tag: string, alt?: string, poster?: string) => {
      if (!url || seen.has(url)) return;
      // Skip data URIs, tiny inline images, tracking pixels
      if (url.startsWith('data:')) return;
      if (url.includes('1x1') || url.includes('pixel') || url.includes('spacer')) return;
      seen.add(url);
      media.push({ url, type, alt, poster, sourceTag: tag, foundOn: pageUrl });
    };

    // <img src="...">
    const imgRe = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
    let m;
    while ((m = imgRe.exec(html)) !== null) {
      const altMatch = m[0].match(/alt=["']([^"']*)["']/i);
      addItem(resolveUrl(pageUrl, m[1]), 'image', 'img', altMatch?.[1]);
    }

    // <picture><source srcset="...">
    const srcsetRe = /srcset=["']([^"']+)["']/gi;
    while ((m = srcsetRe.exec(html)) !== null) {
      const srcs = m[1].split(',').map(s => s.trim().split(/\s+/)[0]);
      srcs.forEach(s => addItem(resolveUrl(pageUrl, s), 'image', 'srcset'));
    }

    // <video src="..."> and <video poster="...">
    const videoRe = /<video[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
    while ((m = videoRe.exec(html)) !== null) {
      const posterMatch = m[0].match(/poster=["']([^"']*)["']/i);
      addItem(resolveUrl(pageUrl, m[1]), 'video', 'video', undefined, posterMatch ? resolveUrl(pageUrl, posterMatch[1]) || undefined : undefined);
    }

    // <source src="..."> inside video/audio
    const sourceRe = /<source[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
    while ((m = sourceRe.exec(html)) !== null) {
      const typeAttr = m[0].match(/type=["']([^"']*)["']/i)?.[1] || '';
      const mType: MediaItem['type'] = typeAttr.includes('video') ? 'video' : typeAttr.includes('audio') ? 'audio' : 'video';
      addItem(resolveUrl(pageUrl, m[1]), mType, 'source');
    }

    // <audio src="...">
    const audioRe = /<audio[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
    while ((m = audioRe.exec(html)) !== null) {
      addItem(resolveUrl(pageUrl, m[1]), 'audio', 'audio');
    }

    // background-image: url(...)
    const bgRe = /url\(["']?([^"')]+)["']?\)/gi;
    while ((m = bgRe.exec(html)) !== null) {
      const url = resolveUrl(pageUrl, m[1]);
      if (url && IMAGE_EXTS.test(url)) addItem(url, 'image', 'css-bg');
    }

    // og:image, og:video, og:audio meta tags
    const ogRe = /<meta[^>]*property=["'](og:(?:image|video|audio)(?::url)?)["'][^>]*content=["']([^"']+)["']/gi;
    while ((m = ogRe.exec(html)) !== null) {
      const type: MediaItem['type'] = m[1].includes('video') ? 'video' : m[1].includes('audio') ? 'audio' : 'image';
      addItem(resolveUrl(pageUrl, m[2]), type, 'og-meta');
    }

    // Also try reverse order: content before property
    const ogRe2 = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](og:(?:image|video|audio)(?::url)?)["']/gi;
    while ((m = ogRe2.exec(html)) !== null) {
      const type: MediaItem['type'] = m[2].includes('video') ? 'video' : m[2].includes('audio') ? 'audio' : 'image';
      addItem(resolveUrl(pageUrl, m[1]), type, 'og-meta');
    }

    // Links to media files
    const aRe = /<a[^>]*\shref=["']([^"']+)["']/gi;
    while ((m = aRe.exec(html)) !== null) {
      const url = resolveUrl(pageUrl, m[1]);
      if (!url) continue;
      if (IMAGE_EXTS.test(url)) addItem(url, 'image', 'a-href');
      else if (VIDEO_EXTS.test(url)) addItem(url, 'video', 'a-href');
      else if (AUDIO_EXTS.test(url)) addItem(url, 'audio', 'a-href');
    }

    // Extract URLs from JSON/JS data blocks (catches lazy-loaded content, JS-rendered sites)
    // Look for URLs in script tags and JSON-LD
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = scriptRe.exec(html)) !== null) {
      const scriptContent = m[1];
      // Find image/video URLs in script content
      const urlInScriptRe = /["'](https?:\/\/[^"'\s]+\.(jpe?g|png|gif|webp|avif|mp4|webm|mov|m3u8)(?:\?[^"'\s]*)?)["']/gi;
      let sm;
      while ((sm = urlInScriptRe.exec(scriptContent)) !== null) {
        const url = sm[1];
        const ext = sm[2].toLowerCase();
        if (VIDEO_EXTS.test('.' + ext)) {
          addItem(url, 'video', 'script-data');
        } else {
          addItem(url, 'image', 'script-data');
        }
      }
    }

    // Extract from data-src, data-lazy-src, data-original attributes (lazy loading)
    const lazyRe = /data-(?:src|lazy-src|original|bg|image)=["']([^"']+)["']/gi;
    while ((m = lazyRe.exec(html)) !== null) {
      const url = resolveUrl(pageUrl, m[1]);
      if (!url) continue;
      if (VIDEO_EXTS.test(url)) addItem(url, 'video', 'data-attr');
      else if (AUDIO_EXTS.test(url)) addItem(url, 'audio', 'data-attr');
      else if (IMAGE_EXTS.test(url) || !url.match(/\.(js|css|html|json|xml|txt)(\?|$)/i)) {
        addItem(url, 'image', 'data-attr');
      }
    }

  } catch (e) {
    console.error('Error scanning', pageUrl, e);
  }

  return media;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json() as { urls: string[] };
    if (!urls || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'No URLs provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Scan up to 20 URLs concurrently
    const batch = urls.slice(0, 20);
    const results = await Promise.allSettled(batch.map(u => extractMedia(u)));

    const allMedia: MediaItem[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const item of r.value) {
          if (!seen.has(item.url)) {
            seen.add(item.url);
            allMedia.push(item);
          }
        }
      }
    }

    return new Response(JSON.stringify({ media: allMedia, scannedPages: batch.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('scan-media error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
