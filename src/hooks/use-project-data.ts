import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProjectData(projectId: string | undefined) {
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const latestRun = useQuery({
    queryKey: ["latest-run", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("crawl_runs")
        .select("*")
        .eq("project_id", projectId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const runId = latestRun.data?.id;

  const pages = useQuery({
    queryKey: ["pages", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pages").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const findings = useQuery({
    queryKey: ["findings", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("findings").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const assets = useQuery({
    queryKey: ["assets", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const endpoints = useQuery({
    queryKey: ["endpoints", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("endpoints").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const secretsFound = useQuery({
    queryKey: ["secrets_found", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("secrets_found").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const techStack = useQuery({
    queryKey: ["tech_stack", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tech_stack_items").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const networkRequests = useQuery({
    queryKey: ["network_requests", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("network_requests").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const searchEntries = useQuery({
    queryKey: ["search_entries", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("search_index_entries").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const graphEdges = useQuery({
    queryKey: ["graph_edges", runId],
    queryFn: async () => {
      const { data, error } = await supabase.from("graph_edges").select("*").eq("crawl_run_id", runId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!runId,
  });

  const isLoading = project.isLoading || latestRun.isLoading;
  const hasData = !!runId;

  const refetchAll = async () => {
    await project.refetch();
    const latestRunResult = await latestRun.refetch();
    // Only refetch child queries if we have a valid run ID
    if (latestRunResult.data?.id) {
      await Promise.all([
        pages.refetch(),
        findings.refetch(),
        assets.refetch(),
        endpoints.refetch(),
        secretsFound.refetch(),
        techStack.refetch(),
        networkRequests.refetch(),
        searchEntries.refetch(),
        graphEdges.refetch(),
      ]);
    }
  };

  return {
    project: project.data,
    latestRun: latestRun.data,
    pages: pages.data || [],
    findings: findings.data || [],
    assets: assets.data || [],
    endpoints: endpoints.data || [],
    secretsFound: secretsFound.data || [],
    techStack: techStack.data || [],
    networkRequests: networkRequests.data || [],
    searchEntries: searchEntries.data || [],
    graphEdges: graphEdges.data || [],
    isLoading,
    hasData,
    refetchAll,
  };
}
