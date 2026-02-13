
-- Endpoints detected in crawled code
CREATE TABLE public.endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  type TEXT NOT NULL DEFAULT 'rest',
  found_in TEXT NOT NULL DEFAULT '',
  line INTEGER NOT NULL DEFAULT 0,
  operation_name TEXT
);

ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own endpoints" ON public.endpoints FOR ALL
  USING (is_crawl_run_owner(crawl_run_id))
  WITH CHECK (is_crawl_run_owner(crawl_run_id));

-- Tech stack items detected
CREATE TABLE public.tech_stack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT,
  category TEXT NOT NULL DEFAULT 'library',
  icon TEXT NOT NULL DEFAULT '📦',
  confidence REAL NOT NULL DEFAULT 0.5
);

ALTER TABLE public.tech_stack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own tech_stack_items" ON public.tech_stack_items FOR ALL
  USING (is_crawl_run_owner(crawl_run_id))
  WITH CHECK (is_crawl_run_owner(crawl_run_id));

-- Exposed secrets detected (always masked)
CREATE TABLE public.secrets_found (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'unknown',
  masked_value TEXT NOT NULL DEFAULT '****',
  severity TEXT NOT NULL DEFAULT 'medium',
  location TEXT NOT NULL DEFAULT '',
  line INTEGER NOT NULL DEFAULT 0,
  context TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.secrets_found ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own secrets_found" ON public.secrets_found FOR ALL
  USING (is_crawl_run_owner(crawl_run_id))
  WITH CHECK (is_crawl_run_owner(crawl_run_id));

-- Network requests captured during crawl
CREATE TABLE public.network_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'GET',
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'document',
  size INTEGER NOT NULL DEFAULT 0,
  timing INTEGER NOT NULL DEFAULT 0,
  initiator TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.network_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own network_requests" ON public.network_requests FOR ALL
  USING (is_crawl_run_owner(crawl_run_id))
  WITH CHECK (is_crawl_run_owner(crawl_run_id));

-- Graph edges for visualization
CREATE TABLE public.graph_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'page',
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'asset',
  label TEXT NOT NULL DEFAULT 'loads'
);

ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own graph_edges" ON public.graph_edges FOR ALL
  USING (is_crawl_run_owner(crawl_run_id))
  WITH CHECK (is_crawl_run_owner(crawl_run_id));

-- Add consent column to crawl_runs
ALTER TABLE public.crawl_runs ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT false;

-- Add render_pass column to crawl_runs  
ALTER TABLE public.crawl_runs ADD COLUMN IF NOT EXISTS render_pass BOOLEAN NOT NULL DEFAULT false;
