const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, refererUrl } = await req.json() as { url: string; refererUrl?: string };
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Proxying download:', url, 'referer:', refererUrl);

    const origin = new URL(url).origin;
    const referer = refererUrl || origin + '/';
    
    // First attempt: standard fetch with browser-like headers
    let resp = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': referer,
        'Origin': new URL(referer).origin,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Ch-Ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      },
      redirect: 'follow',
    });

    // If 403, retry using Firecrawl as a headless browser to get the actual content
    if (!resp.ok && resp.status === 403) {
      console.log('Direct fetch got 403, trying Firecrawl scrape...');
      const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (apiKey) {
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
          // For download URLs that redirect to actual files, Firecrawl may follow them
          // Return the raw response or indicate the redirect target
          const finalUrl = fcData.data?.metadata?.sourceURL || fcData.data?.metadata?.url || url;
          if (finalUrl !== url) {
            console.log('Firecrawl found redirect to:', finalUrl);
            resp = await fetch(finalUrl, {
              headers: {
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                'Accept': '*/*',
                'Referer': referer,
              },
              redirect: 'follow',
            });
          }
        }
      }
    }

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch: ${resp.status}` }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const contentLength = resp.headers.get('content-length');
    const body = await resp.arrayBuffer();

    // Extract filename from URL
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
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
