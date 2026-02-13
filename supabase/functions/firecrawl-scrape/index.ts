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
  streamUrl?: string;
}

// Decode obfuscated video source URLs (reversed base64 after ==)
function decodeVideoSrc(encoded: string): string | null {
  try {
    const eqIdx = encoded.indexOf('==');
    if (eqIdx === -1) return null;
    const afterEq = encoded.substring(eqIdx + 2);
    if (!afterEq) return null;
    const reversed = afterEq.split('').reverse().join('');
    // Find base64-encoded https:// (aHR0cHM6Ly or aHR0cDovL)
    const httpsMark = reversed.indexOf('aHR0cHM6Ly');
    const httpMark = reversed.indexOf('aHR0cDovL');
    const startIdx = httpsMark !== -1 ? httpsMark : httpMark;
    if (startIdx === -1) return null;
    // Extract base64 chars from the start marker
    const b64Chars = /^[A-Za-z0-9+/=]+/;
    const match = reversed.substring(startIdx).match(b64Chars);
    if (!match) return null;
    let b64 = match[0];
    // Fix padding
    while (b64.length % 4 !== 0) b64 += '=';
    const decoded = atob(b64);
    if (decoded.startsWith('http')) return decoded;
    return null;
  } catch {
    return null;
  }
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
    if (item.url.includes('/asset/images/icon/')) return;
    seen.add(item.url);
    media.push({ foundOn: pageUrl, ...item } as MediaItem);
  };

  let m;

  // === PRIORITY 1: Extract from light-gallery-item data attributes (original quality) ===
  // Find each light-gallery-item block by searching for the class, then extracting the full tag
  // by finding matching quotes for each attribute (handles > inside quoted values like data-sub-html)
  const lgClassRe = /class="[^"]*light-gallery-item[^"]*"/gi;
  let lgMatch;
  while ((lgMatch = lgClassRe.exec(html)) !== null) {
    // Walk backwards to find <div, then forwards to find the closing >
    const classPos = lgMatch.index;
    let tagStart = html.lastIndexOf('<div', classPos);
    if (tagStart === -1) tagStart = html.lastIndexOf('<DIV', classPos);
    if (tagStart === -1) continue;
    
    // Find the closing > by properly handling quoted attributes
    let i = tagStart + 4; // skip <div
    while (i < html.length) {
      if (html[i] === '"') {
        i = html.indexOf('"', i + 1);
        if (i === -1) break;
      } else if (html[i] === "'") {
        i = html.indexOf("'", i + 1);
        if (i === -1) break;
      } else if (html[i] === '>') {
        break;
      }
      i++;
    }
    if (i >= html.length) continue;
    
    const tag = html.substring(tagStart, i + 1);
    const dataSrc = tag.match(/data-src="([^"]+)"/i)?.[1];
    const dataThumb = tag.match(/data-thumb="([^"]+)"/i)?.[1];
    const dataTitle = tag.match(/data-title="([^"]+)"/i)?.[1];
    const dataVideoMatch = tag.match(/data-video="([^"]+)"/i);
    const subHtmlMatch = tag.match(/data-sub-html="([^"]+)"/i);
    let downloadUrl: string | undefined;
    if (subHtmlMatch) {
      const subHtml = subHtmlMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const dlMatch = subHtml.match(/href="([^"]+)"/i);
      if (dlMatch) downloadUrl = dlMatch[1];
    }

    if (dataVideoMatch) {
      let videoSrc: string | undefined;
      let streamUrl: string | undefined;
      try {
        const videoJson = dataVideoMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const parsed = JSON.parse(videoJson);
        if (parsed.source?.[0]?.src) {
          const rawSrc = parsed.source[0].src;
          // Decode obfuscated HLS URL
          const decoded = decodeVideoSrc(rawSrc);
          if (decoded) {
            streamUrl = decoded;
            console.log('Decoded video stream:', decoded);
          }
          videoSrc = rawSrc;
        }
      } catch { /* ignore */ }
      // Use stream URL as primary, download URL as fallback
      const primaryUrl = streamUrl || downloadUrl || videoSrc;
      if (primaryUrl) {
        addItem({
          url: primaryUrl, type: 'video', sourceTag: 'gallery-video',
          poster: dataThumb ? resolveUrl(pageUrl, dataThumb) || undefined : undefined,
          alt: dataTitle, downloadUrl, streamUrl,
          thumbnailUrl: dataThumb ? resolveUrl(pageUrl, dataThumb) || undefined : undefined,
        });
      }
    } else if (dataSrc) {
      const originalUrl = resolveUrl(pageUrl, dataSrc);
      if (originalUrl) {
        addItem({
          url: originalUrl, type: 'image', sourceTag: 'gallery-original',
          alt: dataTitle, thumbnailUrl: dataThumb ? resolveUrl(pageUrl, dataThumb) || undefined : undefined,
        });
      }
    }
  }

  // === PRIORITY 2: Standard extraction ===
  const imgRe = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*/gi;
  while ((m = imgRe.exec(html)) !== null) {
    if (m[1].startsWith('data:')) continue;
    const resolved = resolveUrl(pageUrl, m[1]);
    if (resolved && !/_\d+\.(jpg|jpeg|png|webp|gif)$/i.test(resolved)) {
      const altMatch = m[0].match(/alt=["']([^"']*)["']/i);
      addItem({ url: resolved, type: 'image', sourceTag: 'img', alt: altMatch?.[1] });
    }
  }

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

  const bgRe = /url\(["']?([^"')]+)["']?\)/gi;
  while ((m = bgRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (url && IMAGE_EXTS.test(url)) addItem({ url, type: 'image', sourceTag: 'css-bg' });
  }

  const ogRe = /<meta[^>]*(?:property|name)=["'](og:(?:image|video|audio)(?::url)?)["'][^>]*content=["']([^"']+)["']/gi;
  while ((m = ogRe.exec(html)) !== null) {
    const type: MediaItem['type'] = m[1].includes('video') ? 'video' : m[1].includes('audio') ? 'audio' : 'image';
    const url = resolveUrl(pageUrl, m[2]);
    if (url) addItem({ url, type, sourceTag: 'og-meta' });
  }

  const aRe = /<a[^>]*\shref=["']([^"']+)["']/gi;
  while ((m = aRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (!url) continue;
    if (IMAGE_EXTS.test(url)) addItem({ url, type: 'image', sourceTag: 'a-href' });
    else if (VIDEO_EXTS.test(url)) addItem({ url, type: 'video', sourceTag: 'a-href' });
    else if (AUDIO_EXTS.test(url)) addItem({ url, type: 'audio', sourceTag: 'a-href' });
  }

  const lazyRe = /data-(?:src|lazy-src|original|bg|image)=["']([^"']+)["']/gi;
  while ((m = lazyRe.exec(html)) !== null) {
    const url = resolveUrl(pageUrl, m[1]);
    if (!url || /_\d+\.(jpg|jpeg|png|webp|gif)$/i.test(url)) continue;
    if (VIDEO_EXTS.test(url)) addItem({ url, type: 'video', sourceTag: 'data-attr' });
    else if (AUDIO_EXTS.test(url)) addItem({ url, type: 'audio', sourceTag: 'data-attr' });
    else if (IMAGE_EXTS.test(url) || !url.match(/\.(js|css|html|json|xml|txt)(\?|$)/i)) {
      addItem({ url, type: 'image', sourceTag: 'data-attr' });
    }
  }

  return media;
}

// Detect total page count from pagination or tab counts
function detectPageCount(html: string): number {
  // Try to find tab counts like "Photos (192)" or "Videos (199)"
  const tabCountRe = /(?:Photos|Videos|All)\s*\((\d+)\)/gi;
  let maxCount = 0;
  let m;
  while ((m = tabCountRe.exec(html)) !== null) {
    const count = parseInt(m[1]);
    if (count > maxCount) maxCount = count;
  }
  // ~44 items per page
  if (maxCount > 0) return Math.ceil(maxCount / 44);

  // Try pagination links
  const pageRe = /[?&]page=(\d+)/gi;
  let maxPage = 1;
  while ((m = pageRe.exec(html)) !== null) {
    const p = parseInt(m[1]);
    if (p > maxPage) maxPage = p;
  }
  return maxPage;
}

async function scrapePage(apiKey: string, url: string): Promise<{ html: string; links: string[] }> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['rawHtml', 'links'],
      waitFor: 5000,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Firecrawl error ${response.status}`);

  return {
    html: data.data?.rawHtml || data.data?.html || data.rawHtml || data.html || '',
    links: data.data?.links || data.links || [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, paginate, maxPages } = await req.json() as { url: string; paginate?: boolean; maxPages?: number };
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

    console.log('Firecrawl scraping:', formattedUrl, paginate ? '(with pagination)' : '');

    // Scrape first page
    const firstPage = await scrapePage(apiKey, formattedUrl);
    const allMedia: MediaItem[] = extractMediaFromHtml(firstPage.html, formattedUrl);
    const seenUrls = new Set(allMedia.map(m => m.url));

    let scannedPages = 1;

    // If pagination requested, detect and scrape remaining pages
    if (paginate) {
      const totalPages = Math.min(detectPageCount(firstPage.html), maxPages || 20);
      console.log(`Detected ${totalPages} total pages, scraping...`);

      // Scrape pages 2..N concurrently in batches of 3
      for (let batch = 2; batch <= totalPages; batch += 3) {
        const pagePromises: Promise<void>[] = [];
        for (let p = batch; p < batch + 3 && p <= totalPages; p++) {
          const pageUrl = new URL(formattedUrl);
          pageUrl.searchParams.set('page', String(p));
          const pUrl = pageUrl.toString();

          pagePromises.push(
            scrapePage(apiKey, pUrl).then(result => {
              const pageMedia = extractMediaFromHtml(result.html, pUrl);
              for (const item of pageMedia) {
                if (!seenUrls.has(item.url)) {
                  seenUrls.add(item.url);
                  allMedia.push(item);
                }
              }
              scannedPages++;
              console.log(`Page ${p}: found ${pageMedia.length} items (total: ${allMedia.length})`);
            }).catch(err => {
              console.warn(`Page ${p} failed:`, err.message);
            })
          );
        }
        await Promise.all(pagePromises);
      }
    }

    // Also check links for direct media file URLs
    for (const link of firstPage.links) {
      if (seenUrls.has(link)) continue;
      if (IMAGE_EXTS.test(link) && !/_\d+\.(jpg|jpeg|png|webp|gif)$/i.test(link)) {
        seenUrls.add(link);
        allMedia.push({ url: link, type: 'image', sourceTag: 'firecrawl-link', foundOn: formattedUrl });
      } else if (VIDEO_EXTS.test(link)) {
        seenUrls.add(link);
        allMedia.push({ url: link, type: 'video', sourceTag: 'firecrawl-link', foundOn: formattedUrl });
      } else if (AUDIO_EXTS.test(link)) {
        seenUrls.add(link);
        allMedia.push({ url: link, type: 'audio', sourceTag: 'firecrawl-link', foundOn: formattedUrl });
      }
    }

    const originals = allMedia.filter(m => m.sourceTag === 'gallery-original' || m.sourceTag === 'gallery-video').length;
    console.log(`Total: ${allMedia.length} media items (${originals} gallery originals/videos) across ${scannedPages} pages`);

    return new Response(JSON.stringify({ success: true, media: allMedia, scannedPages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('firecrawl-scrape error:', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
