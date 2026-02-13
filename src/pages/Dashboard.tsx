import { StatCard } from "@/components/StatCard";
import { SeverityBadge } from "@/components/SeverityBadge";
import { demoProject, demoCrawlRun, demoFindings } from "@/lib/demo-data";
import { Link } from "react-router-dom";
import { Globe, ArrowRight, Activity, AlertTriangle, FileCode, Clock } from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const highCount = demoFindings.filter(f => f.severity === "high").length;
  const medCount = demoFindings.filter(f => f.severity === "medium").length;
  const lowCount = demoFindings.filter(f => f.severity === "low").length;

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

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard label="Pages Crawled" value={demoCrawlRun.pagesScanned} subtitle="across 1 project" />
        <StatCard label="Total Findings" value={demoFindings.length} subtitle={`${highCount} high severity`} />
        <StatCard label="Avg Response" value="310ms" subtitle="across all pages" />
        <StatCard label="Assets Found" value={6} subtitle="JS, CSS, images" />
      </motion.div>

      {/* Recent Project */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Project</h2>
          <Link to="/projects" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <Link
          to={`/projects/${demoProject.id}`}
          className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{demoProject.name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{demoProject.startUrl}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {demoCrawlRun.pagesScanned} pages</span>
            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {demoCrawlRun.errorsCount} errors</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 7m 34s</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Link>
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
          {demoFindings.filter(f => f.severity === "high" || f.severity === "medium").slice(0, 5).map((f) => (
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
