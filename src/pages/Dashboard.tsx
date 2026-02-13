import { StatCard } from "@/components/StatCard";
import { SeverityBadge } from "@/components/SeverityBadge";
import { useDashboardStats } from "@/hooks/use-projects";
import { Link } from "react-router-dom";
import { Globe, ArrowRight, Activity, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { data, isLoading } = useDashboardStats();

  const projects = data?.projects || [];
  const latestRun = data?.latestRun;
  const findings = data?.latestFindings || [];
  const latestProject = projects[0];

  const highCount = findings.filter(f => f.severity === "high").length;
  const medCount = findings.filter(f => f.severity === "medium").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
          New Project
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Pages Crawled" value={latestRun?.pages_scanned ?? 0} />
        <StatCard label="Total Findings" value={findings.length} subtitle={highCount > 0 ? `${highCount} high severity` : undefined} />
        <StatCard label="Errors" value={latestRun?.errors_count ?? 0} />
      </motion.div>

      {latestProject && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Project</h2>
            <Link to="/projects" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <Link to={`/projects/${latestProject.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{latestProject.name}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{latestProject.start_url}</p>
            </div>
            {latestRun && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {latestRun.pages_scanned} pages</span>
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {latestRun.errors_count} errors</span>
              </div>
            )}
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </motion.div>
      )}

      {findings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-lg border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Top Findings</h2>
          </div>
          <div className="divide-y divide-border">
            {findings.filter(f => f.severity === "high" || f.severity === "medium").slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-start gap-3 px-5 py-3">
                <SeverityBadge severity={f.severity as any} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.message}</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{f.category}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {projects.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No projects yet. Create your first inspection project to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
