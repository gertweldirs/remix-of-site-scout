import { StatCard } from "@/components/StatCard";
import { SeverityBadge } from "@/components/SeverityBadge";
import { demoFindings } from "@/lib/demo-data";
import { Link } from "react-router-dom";
import { Globe, ArrowRight, Activity, AlertTriangle, Clock, Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, crawl_runs(*)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentFindings } = useQuery({
    queryKey: ["dashboard-findings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("findings")
        .select("*")
        .order("id", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const findings = recentFindings && recentFindings.length > 0
    ? recentFindings.map(f => ({ id: f.id, severity: f.severity as any, title: f.title, message: f.message, category: f.category }))
    : demoFindings;

  const highCount = findings.filter(f => f.severity === "high").length;
  const totalProjects = projects?.length || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your inspection projects</p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard label="Projects" value={totalProjects || 1} subtitle="inspection targets" />
        <StatCard label="Total Findings" value={findings.length} subtitle={`${highCount} high severity`} />
        <StatCard label="Avg Response" value="310ms" subtitle="across all pages" />
        <StatCard label="Assets Found" value={6} subtitle="JS, CSS, images" />
      </motion.div>

      {/* Recent Projects */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
          <Link to="/projects" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : projects && projects.length > 0 ? (
          projects.slice(0, 3).map((p: any) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{p.start_url}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {p.crawl_runs?.length || 0} runs
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))
        ) : (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No projects yet. <Link to="/projects/new" className="text-primary hover:underline">Create one</Link>
          </div>
        )}
      </motion.div>

      {/* Top Findings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Top Findings</h2>
        </div>
        <div className="divide-y divide-border">
          {findings.filter(f => f.severity === "high" || f.severity === "medium").slice(0, 5).map((f) => (
            <div key={f.id} className="flex items-start gap-3 px-5 py-3">
              <SeverityBadge severity={f.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.message}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono shrink-0">{f.category}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
