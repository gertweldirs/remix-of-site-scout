import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { parseHTML } from "https://esm.sh/linkedom@0.14.26";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

// Secret detection patterns
const SECRET_PATTERNS = [
  { type: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g, severity: "high" },
  { type: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/g, severity: "high" },
  { type: "Stripe Publishable Key", regex: /pk_live_[0-9a-zA-Z]{24,}/g, severity: "low" },
  { type: "Google API Key", regex: /AIza[0-9A-Za-z_-]{35}/g, severity: "high" },
  { type: "JWT Token", regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: "medium" },
  { type: "Private Key", regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, severity: "high" },
  { type: "GitHub Token", regex: /gh[ps]_[A-Za-z0-9_]{36,}/g, severity: "high" },
  { type: "Slack Token", regex: /xox[bpors]-[0-9A-Za-z-]{10,}/g, severity: "high" },
  { type: "Generic API Key", regex: /(?:api[_-]?key|apikey|api_secret)\s*[:=]\s*["']([^"']{8,})["']/gi, severity: "medium" },
];

// Tech stack detection signatures
const TECH_SIGNATURES = [
  { name: "React", pattern: /__REACT_DEVTOOLS|react\.production|react-dom/i, category: "framework", icon: "⚛️" },
  { name: "Vue.js", pattern: /__VUE__|vue\.runtime|vue\.global/i, category: "framework", icon: "💚" },
  { name: "Angular", pattern: /ng-version|angular\.js|@angular/i, category: "framework", icon: "🔺" },
  { name: "Next.js", pattern: /__NEXT_DATA__|next\/dist|_next\//i, category: "framework", icon: "▲" },
  { name: "Nuxt", pattern: /__NUXT__|nuxt\.js/i, category: "framework", icon: "💚" },
  { name: "Svelte", pattern: /svelte-|__svelte/i, category: "framework", icon: "🔥" },
  { name: "jQuery", pattern: /jquery[.\-/]|jQuery\./i, category: "library", icon: "📦" },
  { name: "Tailwind CSS", pattern: /tailwindcss|tw-[a-z]/i, category: "css", icon: "🎨" },
  { name: "Bootstrap", pattern: /bootstrap[.\-/]|\.btn-primary/i, category: "css", icon: "🅱️" },
  { name: "Webpack", pattern: /webpackChunk|__webpack_require__/i, category: "bundler", icon: "📦" },
  { name: "Vite", pattern: /@vite\/client|import\.meta\.hot/i, category: "bundler", icon: "⚡" },
  { name: "Google Analytics", pattern: /gtag|google-analytics|ga\.js|analytics\.js/i, category: "analytics", icon: "📊" },
  { name: "Google Tag Manager", pattern: /googletagmanager|gtm\.js/i, category: "analytics", icon: "🏷️" },
  { name: "Sentry", pattern: /sentry[.\-/]|@sentry|Sentry\.init/i, category: "monitoring", icon: "🐛" },
  { name: "Cloudflare", pattern: /cloudflare|cf-ray|__cf_bm/i, category: "cdn", icon: "☁️" },
  { name: "WordPress", pattern: /wp-content|wp-includes|wordpress/i, category: "cms", icon: "📝" },
  { name: "Shopify", pattern: /shopify|cdn\.shopify\.com/i, category: "cms", icon: "🛍️" },
];

// Endpoint detection patterns in JS
const ENDPOINT_PATTERNS = [
  { regex: /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g, method: "GET" },
  { regex: /axios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi, method: null },
  { regex: /\.open\s*\(\s*["'](GET|POST|PUT|DELETE)["']\s*,\s*["']([^"']+)["']/gi, method: null },
  { regex: /new\s+WebSocket\s*\(\s*["'`]([^"'`]+)["'`]/g, method: "WS" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, crawlRunId, projectId } = await req.json();
    if (!url || !crawlRunId) {
      return jsonResponse({ error: "url and crawlRunId are required" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isOwner } = await supabase.rpc("is_crawl_run_owner", { p_run_id: crawlRunId });
    if (!isOwner) return jsonResponse({ error: "Forbidden" }, 403);

    // Fetch the page
    const startTime = performance.now();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "SiteInspector/1.0" },
        redirect: "follow",
      });
    } catch (fetchErr) {
      // Save network error as finding
      await supabase.from("findings").insert({
        crawl_run_id: crawlRunId,
        title: "Network Error",
        severity: "high",
        type: "quality",
        category: "connectivity",
        location: url,
        message: `Failed to fetch: ${fetchErr instanceof Error ? fetchErr.message : "Unknown error"}`,
      });
      return jsonResponse({ success: false, error: "fetch failed" });
    }
    const responseTime = Math.round(performance.now() - startTime);

    // Save network request
    const contentLength = response.headers.get("content-length");
    await supabase.from("network_requests").insert({
      crawl_run_id: crawlRunId,
      method: "GET",
      url,
      status_code: response.status,
      type: "document",
      size: contentLength ? parseInt(contentLength) : 0,
      timing: responseTime,
      initiator: "crawler",
    });

    const contentType = response.headers.get("content-type") || "";

    // Non-HTML → save as asset
    if (!contentType.includes("text/html")) {
      await supabase.from("assets").insert({
        crawl_run_id: crawlRunId,
        url,
        type: contentType.split(";")[0],
        size: contentLength ? parseInt(contentLength) : 0,
        hash: await hashStr(url),
      });
      return jsonResponse({ success: true, type: "asset", links: [] });
    }

    // Non-200 → save page + finding
    if (!response.ok) {
      await supabase.from("pages").insert({
        crawl_run_id: crawlRunId, url, status_code: response.status,
        response_time: responseTime, title: "", meta_description: "",
        content_type: contentType.split(";")[0],
      });
      if (response.status === 404) {
        await supabase.from("findings").insert({
          crawl_run_id: crawlRunId, title: "Broken page (404)",
          severity: "high", type: "quality", category: "links",
          location: url, message: `Page returned 404 Not Found`,
        });
      }
      return jsonResponse({ success: true, links: [] });
    }

    // Parse HTML
    const html = await response.text();
    const { document: doc } = parseHTML(html);

    // Extract metadata
    const title = doc.querySelector("title")?.textContent ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");

    const scriptEls = doc.querySelectorAll("script");
    const stylesheetEls = doc.querySelectorAll('link[rel="stylesheet"]');
    const imageEls = doc.querySelectorAll("img");
    const linkEls = doc.querySelectorAll("a[href]");

    // Save page
    await supabase.from("pages").insert({
      crawl_run_id: crawlRunId, url, status_code: response.status,
      response_time: responseTime, title, meta_description: metaDescription,
      canonical, scripts_count: scriptEls.length, stylesheets_count: stylesheetEls.length,
      images_count: imageEls.length, links_count: linkEls.length,
      content_type: contentType.split(";")[0],
    });

    // ─── Assets ───
    const assetEntries: { url: string; type: string }[] = [];
    scriptEls.forEach((el: any) => {
      const src = el.getAttribute("src");
      if (src) assetEntries.push({ url: resolveUrl(src, url), type: "script" });
    });
    stylesheetEls.forEach((el: any) => {
      const href = el.getAttribute("href");
      if (href) assetEntries.push({ url: resolveUrl(href, url), type: "stylesheet" });
    });
    imageEls.forEach((el: any) => {
      const src = el.getAttribute("src");
      if (src) assetEntries.push({ url: resolveUrl(src, url), type: "image" });
    });
    doc.querySelectorAll('link[rel*="icon"][href]').forEach((el: any) => {
      assetEntries.push({ url: resolveUrl(el.getAttribute("href")!, url), type: "image" });
    });
    doc.querySelectorAll('link[rel*="preload"][href], link[rel*="prefetch"][href]').forEach((el: any) => {
      assetEntries.push({ url: resolveUrl(el.getAttribute("href")!, url), type: "other" });
    });
    doc.querySelectorAll("video source[src], audio source[src]").forEach((el: any) => {
      assetEntries.push({ url: resolveUrl(el.getAttribute("src")!, url), type: el.closest("video") ? "video" : "audio" });
    });
    doc.querySelectorAll('link[rel="manifest"][href]').forEach((el: any) => {
      assetEntries.push({ url: resolveUrl(el.getAttribute("href")!, url), type: "manifest" });
    });

    // Dedupe + save
    const seen = new Set<string>();
    const uniqueAssets = assetEntries.filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; });
    if (uniqueAssets.length > 0) {
      const rows = await Promise.all(uniqueAssets.map(async a => ({
        crawl_run_id: crawlRunId, url: a.url, type: a.type,
        hash: await hashStr(a.url), size: 0,
      })));
      await supabase.from("assets").insert(rows);
    }

    // ─── Inline JS analysis ───
    const inlineScripts: string[] = [];
    scriptEls.forEach((el: any) => {
      if (!el.getAttribute("src") && el.textContent) inlineScripts.push(el.textContent);
    });
    const fullSource = html + "\n" + inlineScripts.join("\n");

    // Detect secrets
    const secretsFound: any[] = [];
    for (const pat of SECRET_PATTERNS) {
      const matches = fullSource.matchAll(pat.regex);
      for (const m of matches) {
        const val = m[1] || m[0];
        secretsFound.push({
          crawl_run_id: crawlRunId,
          type: pat.type,
          masked_value: maskValue(val),
          severity: pat.severity,
          location: url,
          line: getLineNumber(fullSource, m.index || 0),
          context: getContext(fullSource, m.index || 0),
          hash: await hashStr(val),
        });
      }
    }
    if (secretsFound.length > 0) {
      await supabase.from("secrets_found").insert(secretsFound);
      // Also create findings
      for (const s of secretsFound) {
        await supabase.from("findings").insert({
          crawl_run_id: crawlRunId, title: `Possible ${s.type} in source`,
          severity: s.severity, type: "security", category: "secrets",
          location: `${url}:${s.line}`, message: `Detected ${s.type}: ${s.masked_value}`,
        });
      }
    }

    // Detect tech stack
    const techFound: any[] = [];
    const techSeen = new Set<string>();
    for (const sig of TECH_SIGNATURES) {
      if (sig.pattern.test(fullSource) && !techSeen.has(sig.name)) {
        techSeen.add(sig.name);
        // Try to extract version
        const versionMatch = fullSource.match(new RegExp(`${sig.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/@ ]?(\\d+\\.\\d+[\\.\\d]*)`, "i"));
        techFound.push({
          crawl_run_id: crawlRunId, name: sig.name,
          version: versionMatch?.[1] || null,
          category: sig.category, icon: sig.icon, confidence: 0.8,
        });
      }
    }
    if (techFound.length > 0) {
      await supabase.from("tech_stack_items").insert(techFound);
    }

    // Detect endpoints in JS
    const endpointsFound: any[] = [];
    const epSeen = new Set<string>();
    for (const ep of ENDPOINT_PATTERNS) {
      const matches = fullSource.matchAll(ep.regex);
      for (const m of matches) {
        const epUrl = m[2] || m[1];
        const method = m[1]?.toUpperCase() || ep.method || "GET";
        if (!epUrl || epSeen.has(epUrl)) continue;
        epSeen.add(epUrl);
        const isWs = epUrl.startsWith("ws") || method === "WS";
        const isGraphQL = epUrl.includes("graphql");
        endpointsFound.push({
          crawl_run_id: crawlRunId, url: epUrl,
          method: isWs ? "WS" : method,
          type: isWs ? "websocket" : isGraphQL ? "graphql" : "rest",
          found_in: url, line: getLineNumber(fullSource, m.index || 0),
        });
      }
    }
    if (endpointsFound.length > 0) {
      await supabase.from("endpoints").insert(endpointsFound);
    }

    // ─── SEO findings ───
    const findings: any[] = [];

    if (!title) {
      findings.push({ crawl_run_id: crawlRunId, title: "Missing page title", severity: "medium", type: "seo", category: "title", location: url, message: "No <title> tag found" });
    }
    if (!metaDescription) {
      findings.push({ crawl_run_id: crawlRunId, title: "Missing meta description", severity: "low", type: "seo", category: "meta", location: url, message: "No meta description found" });
    }
    const h1s = doc.querySelectorAll("h1");
    if (h1s.length === 0) {
      findings.push({ crawl_run_id: crawlRunId, title: "Missing H1 tag", severity: "low", type: "seo", category: "heading", location: url, message: "No <h1> element found" });
    } else if (h1s.length > 1) {
      findings.push({ crawl_run_id: crawlRunId, title: "Multiple H1 tags", severity: "low", type: "seo", category: "heading", location: url, message: `Found ${h1s.length} <h1> elements, should have exactly 1` });
    }
    if (!doc.querySelector('meta[name="viewport"]')) {
      findings.push({ crawl_run_id: crawlRunId, title: "Missing viewport meta", severity: "medium", type: "seo", category: "meta", location: url, message: "No viewport meta tag — mobile rendering may be broken" });
    }

    // Security header checks (from response)
    const secHeaders = ["content-security-policy", "x-frame-options", "strict-transport-security", "x-content-type-options"];
    for (const h of secHeaders) {
      if (!response.headers.get(h)) {
        findings.push({
          crawl_run_id: crawlRunId,
          title: `Missing ${h} header`,
          severity: h === "content-security-policy" || h === "strict-transport-security" ? "high" : "medium",
          type: "security", category: "headers", location: url,
          message: `Response is missing the ${h} header`,
        });
      }
    }

    // Mixed content
    imageEls.forEach((el: any) => {
      const src = el.getAttribute("src");
      if (src?.startsWith("http://") && url.startsWith("https://")) {
        findings.push({
          crawl_run_id: crawlRunId, title: "Mixed content",
          severity: "info", type: "security", category: "mixed-content",
          location: url, message: `HTTP resource on HTTPS page: ${src}`,
        });
      }
    });

    if (findings.length > 0) {
      await supabase.from("findings").insert(findings);
    }

    // ─── Graph edges ───
    const graphEdges: any[] = [];
    uniqueAssets.forEach(a => {
      graphEdges.push({ crawl_run_id: crawlRunId, source_id: url, source_type: "page", target_id: a.url, target_type: "asset", label: "loads" });
    });
    endpointsFound.forEach(e => {
      graphEdges.push({ crawl_run_id: crawlRunId, source_id: url, source_type: "page", target_id: e.url, target_type: "endpoint", label: "calls" });
    });
    if (graphEdges.length > 0) {
      await supabase.from("graph_edges").insert(graphEdges);
    }

    // ─── Extract links for orchestrator ───
    const pageLinks: string[] = [];
    linkEls.forEach((el: any) => {
      const href = el.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:") && !href.startsWith("javascript:")) {
        pageLinks.push(resolveUrl(href, url));
      }
    });

    // Update crawl run stats
    const { data: runStats } = await supabase.from("crawl_runs").select("pages_scanned, errors_count, warnings_count").eq("id", crawlRunId).single();
    if (runStats) {
      const newErrors = findings.filter(f => f.severity === "high").length;
      const newWarnings = findings.filter(f => f.severity === "medium" || f.severity === "low").length;
      await supabase.from("crawl_runs").update({
        pages_scanned: (runStats.pages_scanned || 0) + 1,
        errors_count: (runStats.errors_count || 0) + newErrors,
        warnings_count: (runStats.warnings_count || 0) + newWarnings,
      }).eq("id", crawlRunId);
    }

    return jsonResponse({
      success: true,
      assetsCount: uniqueAssets.length,
      findingsCount: findings.length + secretsFound.length,
      techCount: techFound.length,
      endpointsCount: endpointsFound.length,
      linksFound: pageLinks.length,
      links: pageLinks,
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return new URL(baseUrl).protocol + href;
  try { return new URL(href, baseUrl).toString(); } catch { return href; }
}

async function hashStr(val: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(val));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}

function maskValue(val: string): string {
  if (val.length <= 8) return "****";
  return val.substring(0, 4) + "****..." + "****" + val.substring(val.length - 4);
}

function getLineNumber(source: string, index: number): number {
  return source.substring(0, index).split("\n").length;
}

function getContext(source: string, index: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(source.length, index + 30);
  return source.substring(start, end).replace(/\n/g, " ");
}
