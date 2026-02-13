import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { parseHTML } from "https://esm.sh/linkedom@0.14.26";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, crawlRunId } = await req.json();

    if (!url || !crawlRunId) {
      return new Response(
        JSON.stringify({ error: "url and crawlRunId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify ownership of crawl run
    const { data: runData, error: runError } = await supabase.rpc("is_crawl_run_owner", { p_run_id: crawlRunId });
    if (runError || !runData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized or crawl run not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the page
    const startTime = performance.now();
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SiteInspector/1.0",
      },
    });
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (!response.ok) {
      // Save error page
      await supabase.from("pages").insert({
        crawl_run_id: crawlRunId,
        url,
        status_code: response.status,
        response_time: responseTime,
        title: "",
        meta_description: "",
        content_type: response.headers.get("content-type") || "text/html",
      });

      return new Response(
        JSON.stringify({ success: false, status: response.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      // Save non-HTML response
      const sizeHeader = response.headers.get("content-length");
      const size = sizeHeader ? parseInt(sizeHeader) : 0;

      await supabase.from("assets").insert({
        crawl_run_id: crawlRunId,
        url,
        type: contentType.split(";")[0],
        size,
        hash: await hashUrl(url),
      });

      return new Response(
        JSON.stringify({ success: true, type: "asset" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse HTML
    const html = await response.text();
    const { document: doc } = parseHTML(html);

    // Extract metadata
    const title =
      doc.querySelector("title")?.textContent ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      "";

    const metaDescription =
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      "";

    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");

    // Count resources
    const scripts = doc.querySelectorAll("script").length;
    const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]').length;
    const images = doc.querySelectorAll("img").length;
    const links = doc.querySelectorAll("a[href]").length;

    // Save page
    const { data: pageData, error: pageError } = await supabase
      .from("pages")
      .insert({
        crawl_run_id: crawlRunId,
        url,
        status_code: response.status,
        response_time: responseTime,
        title,
        meta_description: metaDescription,
        canonical,
        scripts_count: scripts,
        stylesheets_count: stylesheets,
        images_count: images,
        links_count: links,
        content_type: contentType.split(";")[0],
      })
      .select();

    if (pageError) {
      console.error("Error saving page:", pageError);
      return new Response(
        JSON.stringify({ error: "Failed to save page" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract and save assets
    const assetUrls = new Set<string>();

    // Scripts
    doc.querySelectorAll("script[src]").forEach((el) => {
      const src = el.getAttribute("src");
      if (src) assetUrls.add(src);
    });

    // Stylesheets
    doc.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => {
      const href = el.getAttribute("href");
      if (href) assetUrls.add(href);
    });

    // Images
    doc.querySelectorAll("img[src]").forEach((el) => {
      const src = el.getAttribute("src");
      if (src) assetUrls.add(src);
    });

    // Preload/prefetch
    doc.querySelectorAll('link[rel*="prefetch"][href], link[rel*="preload"][href]').forEach((el) => {
      const href = el.getAttribute("href");
      if (href) assetUrls.add(href);
    });

    // Save assets
    const assets = Array.from(assetUrls).map((assetUrl) => ({
      crawl_run_id: crawlRunId,
      url: resolveUrl(assetUrl, url),
      type: getAssetType(assetUrl),
      hash: hashUrl(assetUrl),
    }));

    if (assets.length > 0) {
      const { error: assetError } = await supabase.from("assets").insert(assets);
      if (assetError) {
        console.error("Error saving assets:", assetError);
      }
    }

    // Extract links for next crawl
    const pageLinks: string[] = [];
    doc.querySelectorAll("a[href]").forEach((el) => {
      const href = el.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
        pageLinks.push(resolveUrl(href, url));
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        page: pageData?.[0],
        assetsCount: assets.length,
        linksFound: pageLinks.length,
        links: pageLinks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Crawl error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function resolveUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  if (href.startsWith("//")) {
    const baseProtocol = new URL(baseUrl).protocol;
    return baseProtocol + href;
  }
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function getAssetType(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() || "";
  const typeMap: Record<string, string> = {
    js: "script",
    css: "stylesheet",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    svg: "image",
    webp: "image",
    woff: "font",
    woff2: "font",
    ttf: "font",
    mp4: "video",
    webm: "video",
    mp3: "audio",
    wav: "audio",
  };
  return typeMap[ext] || "other";
}

async function hashUrl(url: string): Promise<string> {
  const encoded = new TextEncoder().encode(url);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}
