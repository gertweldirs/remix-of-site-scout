
-- Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_url TEXT NOT NULL,
  max_depth INT NOT NULL DEFAULT 3,
  max_pages INT NOT NULL DEFAULT 500,
  concurrency INT NOT NULL DEFAULT 5,
  user_agent TEXT NOT NULL DEFAULT 'SiteInspector/1.0',
  crawl_delay INT NOT NULL DEFAULT 200,
  same_domain_only BOOLEAN NOT NULL DEFAULT true,
  respect_robots BOOLEAN NOT NULL DEFAULT true,
  follow_redirects BOOLEAN NOT NULL DEFAULT true,
  include_patterns TEXT[] NOT NULL DEFAULT '{}',
  exclude_patterns TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own projects" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Crawl runs
CREATE TABLE public.crawl_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  pages_scanned INT NOT NULL DEFAULT 0,
  pages_total INT NOT NULL DEFAULT 0,
  errors_count INT NOT NULL DEFAULT 0,
  warnings_count INT NOT NULL DEFAULT 0
);
ALTER TABLE public.crawl_runs ENABLE ROW LEVEL SECURITY;

-- Helper function for ownership checks
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Users CRUD own crawl_runs" ON public.crawl_runs FOR ALL
  USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));

-- Pages
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status_code INT NOT NULL DEFAULT 200,
  content_type TEXT NOT NULL DEFAULT 'text/html',
  response_time INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  canonical TEXT,
  links_count INT NOT NULL DEFAULT 0,
  images_count INT NOT NULL DEFAULT 0,
  scripts_count INT NOT NULL DEFAULT 0,
  stylesheets_count INT NOT NULL DEFAULT 0
);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_crawl_run_owner(p_run_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crawl_runs cr
    JOIN public.projects p ON p.id = cr.project_id
    WHERE cr.id = p_run_id AND p.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "Users CRUD own pages" ON public.pages FOR ALL
  USING (public.is_crawl_run_owner(crawl_run_id))
  WITH CHECK (public.is_crawl_run_owner(crawl_run_id));

-- Assets
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  size INT NOT NULL DEFAULT 0,
  hash TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own assets" ON public.assets FOR ALL
  USING (public.is_crawl_run_owner(crawl_run_id))
  WITH CHECK (public.is_crawl_run_owner(crawl_run_id));

-- Findings
CREATE TABLE public.findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'quality',
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own findings" ON public.findings FOR ALL
  USING (public.is_crawl_run_owner(crawl_run_id))
  WITH CHECK (public.is_crawl_run_owner(crawl_run_id));

-- Search index entries
CREATE TABLE public.search_index_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  file TEXT NOT NULL,
  line INT NOT NULL DEFAULT 0,
  col INT NOT NULL DEFAULT 0,
  match TEXT NOT NULL DEFAULT '',
  context TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.search_index_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own search entries" ON public.search_index_entries FOR ALL
  USING (public.is_crawl_run_owner(crawl_run_id))
  WITH CHECK (public.is_crawl_run_owner(crawl_run_id));
