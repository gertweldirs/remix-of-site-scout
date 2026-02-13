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

function extractMediaFromHtml(html: string, pageUrl: string): MediaItem[] {
  const media: MediaItem[] = [];
  const seen = new Set<string>();

  const addItem = (url: string | null, type: MediaItem['type'], tag: string, alt?: string) => {
    if (!url || seen.has(url)) return;
    if (url.startsWith('data:')) return;
    if (url.includes('1x1') || url.includes('pixel') || url.includes('spacer')) return;
    seen.add(url);
    media.push({ url, type, alt, sourceTag: tag, foundOn: pageUrl });
  };

  const resolveUrl = (href: string): string | null => {
    try { return new URL(href, pageUrl).href; } catch { return null; }
  };

  // img tags
  const imgRe = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    const altMatch = m[0].match(/alt=["']([^"']*)["']/i);
    addItem(resolveUrl(m[1]), 'image', 'img', altMatch?.[1]);
  }

  // srcset
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    m[1].split(',').map(s => s.trim().split(/\s+/)[0]).forEach(s => addItem(resolveUrl(s), 'image', 'srcset'));
  }

  // video/audio/source tags
  const videoRe = /<video[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = videoRe.exec(html)) !== null) addItem(resolveUrl(m[1]), 'video', 'video');

  const audioRe = /<audio[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = audioRe.exec(html)) !== null) addItem(resolveUrl(m[1]), 'audio', 'audio');

  const sourceRe = /<source[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = sourceRe.exec(html)) !== null) {
    const typeAttr = m[0].match(/type=["']([^"']*)["']/i)?.[1] || '';
    const mType: MediaItem['type'] = typeAttr.includes('audio') ? 'audio' : 'video';
    addItem(resolveUrl(m[1]), mType, 'source');
  }

  // background-image
  const bgRe = /url\(["']?([^"')]+)["']?\)/gi;
  while ((m = bgRe.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    if (url && IMAGE_EXTS.test(url)) addItem(url, 'image', 'css-bg');
  }

  // og:image/video/audio meta
  const ogRe = /<meta[^>]*(?:property|name)=["'](og:(?:image|video|audio)(?::url)?)["'][^>]*content=["']([^"']+)["']/gi;
  while ((m = ogRe.exec(html)) !== null) {
    const type: MediaItem['type'] = m[1].includes('video') ? 'video' : m[1].includes('audio') ? 'audio' : 'image';
    addItem(resolveUrl(m[2]), type, 'og-meta');
  }

  // Links to media files
  const aRe = /<a[^>]*\shref=["']([^"']+)["']/gi;
  while ((m = aRe.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    if (!url) continue;
    if (IMAGE_EXTS.test(url)) addItem(url, 'image', 'a-href');
    else if (VIDEO_EXTS.test(url)) addItem(url, 'video', 'a-href');
    else if (AUDIO_EXTS.test(url)) addItem(url, 'audio', 'a-href');
  }

  // URLs in script/JSON data
  const urlInScriptRe = /["'](https?:\/\/[^"'\s]+\.(jpe?g|png|gif|webp|avif|mp4|webm|mov|m3u8)(?:\?[^"'\s]*)?)["']/gi;
  while ((m = urlInScriptRe.exec(html)) !== null) {
    const ext = m[2].toLowerCase();
    addItem(m[1], VIDEO_EXTS.test('.' + ext) ? 'video' : 'image', 'script-data');
  }

  // data-src lazy loading
  const lazyRe = /data-(?:src|lazy-src|original|bg|image)=["']([^"']+)["']/gi;
  while ((m = lazyRe.exec(html)) !== null) {
    const url = resolveUrl(m[1]);
    if (!url) continue;
    if (VIDEO_EXTS.test(url)) addItem(url, 'video', 'data-attr');
    else if (AUDIO_EXTS.test(url)) addItem(url, 'audio', 'data-attr');
    else if (IMAGE_EXTS.test(url) || !url.match(/\.(js|css|html|json|xml|txt)(\?|$)/i)) {
      addItem(url, 'image', 'data-attr');
    }
  }

  return media;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json() as { url: string };
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Firecrawl scraping:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['html', 'links'],
        waitFor: 3000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.error || 'Firecrawl request failed' }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract media from the rendered HTML
    const html = data.data?.html || data.html || '';
    const media = extractMediaFromHtml(html, formattedUrl);

    // Also check links for direct media file URLs
    const links: string[] = data.data?.links || data.links || [];
    const seen = new Set(media.map(m => m.url));
    for (const link of links) {
      if (seen.has(link)) continue;
      if (IMAGE_EXTS.test(link)) {
        seen.add(link);
        media.push({ url: link, type: 'image', sourceTag: 'firecrawl-link', foundOn: formattedUrl });
      } else if (VIDEO_EXTS.test(link)) {
        seen.add(link);
        media.push({ url: link, type: 'video', sourceTag: 'firecrawl-link', foundOn: formattedUrl });
      } else if (AUDIO_EXTS.test(link)) {
        seen.add(link);
        media.push({ url: link, type: 'audio', sourceTag: 'firecrawl-link', foundOn: formattedUrl });
      }
    }

    console.log(`Firecrawl found ${media.length} media items`);

    return new Response(JSON.stringify({ success: true, media, scannedPages: 1 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('firecrawl-scrape error:', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
