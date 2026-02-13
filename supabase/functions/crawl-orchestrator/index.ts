import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return jsonRes({ error: "projectId is required" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify ownership
    const { data: isOwner } = await supabase.rpc("is_project_owner", { p_project_id: projectId });
    if (!isOwner) return jsonRes({ error: "Forbidden" }, 403);

    // Get project config
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projErr || !project) return jsonRes({ error: "Project not found" }, 404);

    // Create crawl run
    const { data: run, error: runErr } = await supabase
      .from("crawl_runs")
      .insert({
        project_id: projectId,
        status: "running",
        pages_total: project.max_pages,
        consent: true,
        render_pass: false,
      })
      .select()
      .single();

    if (runErr || !run) return jsonRes({ error: "Failed to create crawl run" }, 500);

    // Update project status
    await supabase.from("projects").update({ status: "running" }).eq("id", projectId);

    // Check robots.txt if enabled
    let disallowedPaths: string[] = [];
    if (project.respect_robots) {
      try {
        const baseUrl = new URL(project.start_url);
        const robotsUrl = `${baseUrl.origin}/robots.txt`;
        const robotsResp = await fetch(robotsUrl, {
          headers: { "User-Agent": "SiteInspector/1.0" },
        });
        if (robotsResp.ok) {
          const robotsTxt = await robotsResp.text();
          let inOurSection = false;
          for (const line of robotsTxt.split("\n")) {
            const trimmed = line.trim().toLowerCase();
            if (trimmed.startsWith("user-agent:")) {
              const agent = trimmed.slice(11).trim();
              inOurSection = agent === "*" || agent === "siteinspector";
            } else if (inOurSection && trimmed.startsWith("disallow:")) {
              const path = trimmed.slice(9).trim();
              if (path) disallowedPaths.push(path);
            }
          }
        }
      } catch { /* robots.txt not available, continue */ }
    }

    // BFS crawl
    const visited = new Set<string>();
    const queue: string[] = [project.start_url];
    const baseHost = new URL(project.start_url).hostname;
    let pagesCrawled = 0;

    const crawlPageUrl = `${SUPABASE_URL}/functions/v1/crawl-page`;

    while (queue.length > 0 && pagesCrawled < project.max_pages) {
      const currentUrl = queue.shift()!;
      
      // Skip if visited
      if (visited.has(currentUrl)) continue;
      
      // Skip if different domain and same_domain_only
      try {
        const urlHost = new URL(currentUrl).hostname;
        if (project.same_domain_only && urlHost !== baseHost) continue;
      } catch { continue; }

      // Skip if matches exclude patterns
      const shouldExclude = project.exclude_patterns.some((p: string) => {
        const regex = new RegExp(p.replace(/\*/g, ".*"));
        return regex.test(currentUrl);
      });
      if (shouldExclude) continue;

      // Skip if disallowed by robots.txt
      const urlPath = new URL(currentUrl).pathname;
      const isDisallowed = disallowedPaths.some(d => urlPath.startsWith(d));
      if (isDisallowed) continue;

      visited.add(currentUrl);

      // Rate limiting
      if (pagesCrawled > 0 && project.crawl_delay > 0) {
        await sleep(project.crawl_delay);
      }

      try {
        const resp = await fetch(crawlPageUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            url: currentUrl,
            crawlRunId: run.id,
            projectId,
          }),
        });

        if (resp.ok) {
          const result = await resp.json();
          pagesCrawled++;

          // Add discovered links to queue
          if (result.links && Array.isArray(result.links)) {
            for (const link of result.links) {
              if (!visited.has(link)) {
                queue.push(link);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error crawling ${currentUrl}:`, err);
      }
    }

    // Complete the crawl run
    await supabase.from("crawl_runs").update({
      status: "completed",
      ended_at: new Date().toISOString(),
      pages_scanned: pagesCrawled,
    }).eq("id", run.id);

    await supabase.from("projects").update({ status: "completed" }).eq("id", projectId);

    return jsonRes({
      success: true,
      crawlRunId: run.id,
      pagesCrawled,
      urlsDiscovered: visited.size,
    });
  } catch (error) {
    console.error("Orchestrator error:", error);
    return jsonRes({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
