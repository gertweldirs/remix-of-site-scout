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
  thumbnailUrl?: string;
  downloadUrl?: string;
}

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif|tiff?)(\?|$)/i;
const VIDEO_EXTS = /\.(mp4|webm|ogg|mov|avi|mkv|m3u8)(\?|$)/i;
const AUDIO_EXTS = /\.(mp3|wav|flac|aac|ogg|m4a|wma)(\?|$)/i;

function resolveUrl(base: string, href: string): string | null {
  try { return new URL(href, base).href; } catch { return null; }
}

function extractMediaFromHtml(html: string, pageUrl: string): MediaItem[] {
  const media: MediaItem[] = [];
  const seen = new Set<string>();

  const addItem = (item: Partial<MediaItem> & { url: string; type: MediaItem['type']; sourceTag: string }) => {
    if (!item.url || seen.has(item.url)) return;
    if (item.url.startsWith('data:')) return;
    if (item.url.includes('1x1') || item.url.includes('pixel') || item.url.includes('spacer')) return;
    // Skip site icons/assets
    if (item.url.includes('/asset/images/icon/')) return;
    seen.add(item.url);
    media.push({ foundOn: pageUrl, ...item } as MediaItem);
  };

  let m;

  // === PRIORITY 1: Extract from light-gallery-item data attributes (original quality) ===
  // Photos: data-src has original, data-thumb has thumbnail
  const lgItemRe = /<div[^>]*class="[^"]*light-gallery-item[^"]*"[^>]*>/gi;
  while ((m = lgItemRe.exec(html)) !== null) {
    const tag = m[0];
    
    // Original image from data-src
    const dataSrc = tag.match(/data-src=["']([^"']+)["']/i)?.[1];
    const dataThumb = tag.match(/data-thumb=["']([^"']+)["']/i)?.[1];
    const dataTitle = tag.match(/data-title=["']([^"']+)["']/i)?.[1];
    
    // Video from data-video JSON
    const dataVideoMatch = tag.match(/data-video=["'](\{[^"']*\})["']/i) || 
                           tag.match(/data-video="([^"]+)"/i);
    
    // Download link from data-sub-html
    const subHtmlMatch = tag.match(/data-sub-html=["']([^"']+)["']/i);
    let downloadUrl: string | undefined;
    if (subHtmlMatch) {
      // Decode HTML entities and extract href
      const subHtml = subHtmlMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      const dlMatch = subHtml.match(/href="([^"]+)"/i);
      if (dlMatch) downloadUrl = dlMatch[1];
    }

    if (dataVideoMatch) {
      // It's a video item
      let videoSrc: string | undefined;
      try {
        const videoJson = dataVideoMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&');
        const parsed = JSON.parse(videoJson);
        if (parsed.source?.[0]?.src) {
          videoSrc = parsed.source[0].src;
        }
      } catch { /* ignore parse errors */ }
      
      // Add with download URL as primary (direct download), video stream as url
      const primaryUrl = downloadUrl || videoSrc;
      if (primaryUrl) {
        addItem({
          url: primaryUrl,
          type: 'video',
          sourceTag: 'gallery-video',
          poster: dataThumb ? resolveUrl(pageUrl, dataThumb) || undefined : undefined,
          alt: dataTitle,
          downloadUrl: downloadUrl,
          thumbnailUrl: dataThumb ? resolveUrl(pageUrl, dataThumb) || undefined : undefined,
        });
      }
    } else if (dataSrc) {
      // It's a photo item - use data-src for ORIGINAL quality
      const originalUrl = resolveUrl(pageUrl, dataSrc);
      if (originalUrl) {
        addItem({
          url: originalUrl,
          type: 'image',
          sourceTag: 'gallery-original',
          alt: dataTitle,
          thumbnailUrl: dataThumb ? resolveUrl(pageUrl, dataThumb) || undefined : undefined,
        });
      }
    }
  }

  // === PRIORITY 2: Standard extraction for non-gallery content ===
  
  // img tags (skip thumbnails we already have originals for)
  const imgRe = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const src = m[1];
    // Skip 1x1 placeholders and thumbnails if we already got originals
    if (src.startsWith('data:')) continue;
    const altMatch = m[0].match(/alt=["']([^"']*)["']/i);
    const resolved = resolveUrl(pageUrl, src);
    if (resolved) {
      // Skip _300 thumbnails - we want originals only
      if (/_\d+\.(jpg|jpeg|png|webp|gif)$/i.test(resolved)) continue;
      addItem({ url: resolved, type: 'image', sourceTag: 'img', alt: altMatch?.[1] });
    }
  }

  // srcset
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    m[1].split(',').map(s => s.trim().split(/\s+/)[0]).forEach(s => {
      const url = resolveUrl(pageUrl, s);
      if (url && !/_\d+\.(jpg|jpeg|png|webp|gif)$/i.test(url)) {
        addItem({ url, type: 'image', sourceTag: 'srcset' });
      }
    });
  }

  // video/audio/source tags
  const videoRe = /<video[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = videoRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (url) addItem({ url, type: 'video', sourceTag: 'video' });
  }

  const audioRe = /<audio[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = audioRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (url) addItem({ url, type: 'audio', sourceTag: 'audio' });
  }

  const sourceRe = /<source[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = sourceRe.exec(html)) !== null) {
    const typeAttr = m[0].match(/type=["']([^"']*)["']/i)?.[1] || '';
    const mType: MediaItem['type'] = typeAttr.includes('audio') ? 'audio' : 'video';
    const url = resolveUrl(pageUrl, m[1]);
    if (url) addItem({ url, type: mType, sourceTag: 'source' });
  }

  // background-image
  const bgRe = /url\(["']?([^"')]+)["']?\)/gi;
  while ((m = bgRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (url && IMAGE_EXTS.test(url)) addItem({ url, type: 'image', sourceTag: 'css-bg' });
  }

  // og:image/video/audio meta
  const ogRe = /<meta[^>]*(?:property|name)=["'](og:(?:image|video|audio)(?::url)?)["'][^>]*content=["']([^"']+)["']/gi;
  while ((m = ogRe.exec(html)) !== null) {
    const type: MediaItem['type'] = m[1].includes('video') ? 'video' : m[1].includes('audio') ? 'audio' : 'image';
    const url = resolveUrl(pageUrl, m[2]);
    if (url) addItem({ url, type, sourceTag: 'og-meta' });
  }

  // Links to media files
  const aRe = /<a[^>]*\shref=["']([^"']+)["']/gi;
  while ((m = aRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (!url) continue;
    if (IMAGE_EXTS.test(url)) addItem({ url, type: 'image', sourceTag: 'a-href' });
    else if (VIDEO_EXTS.test(url)) addItem({ url, type: 'video', sourceTag: 'a-href' });
    else if (AUDIO_EXTS.test(url)) addItem({ url, type: 'audio', sourceTag: 'a-href' });
  }

  // data-src lazy loading (but skip _300 thumbnails)
  const lazyRe = /data-(?:src|lazy-src|original|bg|image)=["']([^"']+)["']/gi;
  while ((m = lazyRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (!url) continue;
    if (/_\d+\.(jpg|jpeg|png|webp|gif)$/i.test(url)) continue;
    if (VIDEO_EXTS.test(url)) addItem({ url, type: 'video', sourceTag: 'data-attr' });
    else if (AUDIO_EXTS.test(url)) addItem({ url, type: 'audio', sourceTag: 'data-attr' });
    else if (IMAGE_EXTS.test(url) || !url.match(/\.(js|css|html|json|xml|txt)(\?|$)/i)) {
      addItem({ url, type: 'image', sourceTag: 'data-attr' });
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
        formats: ['rawHtml', 'links'],
        waitFor: 5000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.error || 'Firecrawl request failed' }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use rawHtml for full rendered content including data attributes
    const html = data.data?.rawHtml || data.data?.html || data.rawHtml || data.html || '';
    const media = extractMediaFromHtml(html, formattedUrl);

    // Also check links for direct media file URLs
    const links: string[] = data.data?.links || data.links || [];
    const seen = new Set(media.map(m => m.url));
    for (const link of links) {
      if (seen.has(link)) continue;
      if (IMAGE_EXTS.test(link) && !/_\d+\.(jpg|jpeg|png|webp|gif)$/i.test(link)) {
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

    const originals = media.filter(m => m.sourceTag === 'gallery-original' || m.sourceTag === 'gallery-video').length;
    console.log(`Firecrawl found ${media.length} media items (${originals} gallery originals/videos)`);

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
