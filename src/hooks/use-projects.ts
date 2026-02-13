import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useLatestCrawlRun(projectId: string | undefined) {
  return useQuery({
    queryKey: ["crawl-run", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crawl_runs")
        .select("*")
        .eq("project_id", projectId!)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useFindings(crawlRunId: string | undefined) {
  return useQuery({
    queryKey: ["findings", crawlRunId],
    enabled: !!crawlRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("findings")
        .select("*")
        .eq("crawl_run_id", crawlRunId!);
      if (error) throw error;
      return data;
    },
  });
}

export function usePages(crawlRunId: string | undefined) {
  return useQuery({
    queryKey: ["pages", crawlRunId],
    enabled: !!crawlRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("crawl_run_id", crawlRunId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useAssets(crawlRunId: string | undefined) {
  return useQuery({
    queryKey: ["assets", crawlRunId],
    enabled: !!crawlRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("crawl_run_id", crawlRunId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useSearchEntries(crawlRunId: string | undefined) {
  return useQuery({
    queryKey: ["search-entries", crawlRunId],
    enabled: !!crawlRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_index_entries")
        .select("*")
        .eq("crawl_run_id", crawlRunId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (project: {
      name: string;
      start_url: string;
      max_depth: number;
      max_pages: number;
      concurrency: number;
      crawl_delay: number;
      user_agent: string;
      respect_robots: boolean;
      same_domain_only: boolean;
      follow_redirects: boolean;
      exclude_patterns: string[];
      include_patterns: string[];
    }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, user_id: session!.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// Dashboard aggregates
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: projects, error: pErr } = await supabase
        .from("projects")
        .select("id, name, start_url, status, created_at")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      let latestRun = null;
      let latestFindings: any[] = [];

      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: runs } = await supabase
          .from("crawl_runs")
          .select("*")
          .in("project_id", projectIds)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        latestRun = runs;

        if (latestRun) {
          const { data: findings } = await supabase
            .from("findings")
            .select("*")
            .eq("crawl_run_id", latestRun.id);
          latestFindings = findings || [];
        }
      }

      return { projects: projects || [], latestRun, latestFindings };
    },
  });
}
