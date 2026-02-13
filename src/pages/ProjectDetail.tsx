import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusDot } from "@/components/StatusDot";
import { Input } from "@/components/ui/input";
import { demoProject, demoCrawlRun, demoPages, demoFindings, demoAssets, demoSearchResults, demoTechStack } from "@/lib/demo-data";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Search, ExternalLink, FileCode, Globe, ShieldCheck, Code2, Package } from "lucide-react";
import { Finding, Severity } from "@/lib/types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

const ProjectDetail = () => {
  const { id } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const project = demoProject; // In real app, fetch by id
  const run = demoCrawlRun;

  const filteredFindings = demoFindings.filter(f => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (searchQuery && !f.title.toLowerCase().includes(searchQuery.toLowerCase()) && !f.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredSearch = demoSearchResults.filter(r =>
    !searchQuery || r.match.toLowerCase().includes(searchQuery.toLowerCase()) || r.context.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highCount = demoFindings.filter(f => f.severity === "high").length;
  const medCount = demoFindings.filter(f => f.severity === "medium").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/projects" className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <StatusDot status={project.status} />
            <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{project.startUrl}</p>
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Pages" value={run.pagesScanned} />
        <StatCard label="Errors" value={run.errorsCount} />
        <StatCard label="Warnings" value={run.warningsCount} />
        <StatCard label="Duration" value="7m 34s" />
        <StatCard label="Assets" value={demoAssets.length} />
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="findings" className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="findings" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-xs">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Findings ({demoFindings.length})
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-xs">
            <Globe className="w-3.5 h-3.5 mr-1.5" /> Pages ({demoPages.length})
          </TabsTrigger>
          <TabsTrigger value="code" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-xs">
            <Code2 className="w-3.5 h-3.5 mr-1.5" /> Code Finder
          </TabsTrigger>
          <TabsTrigger value="assets" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-xs">
            <FileCode className="w-3.5 h-3.5 mr-1.5" /> Assets ({demoAssets.length})
          </TabsTrigger>
          <TabsTrigger value="tech" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-xs">
            <Package className="w-3.5 h-3.5 mr-1.5" /> Tech Stack
          </TabsTrigger>
        </TabsList>

        {/* Findings */}
        <TabsContent value="findings" className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search findings..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "high", "medium", "low", "info"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    severityFilter === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {filteredFindings.map(f => (
              <div key={f.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <SeverityBadge severity={f.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.message}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">{f.category}</span>
                  <p className="text-xs text-muted-foreground/60 font-mono truncate max-w-48 mt-0.5">{f.location}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Pages */}
        <TabsContent value="pages">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">URL</th>
                  <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {demoPages.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground truncate max-w-72">{p.url}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${
                        p.statusCode < 300 ? "bg-success/15 text-success" :
                        p.statusCode < 400 ? "bg-severity-low/15 text-severity-low" :
                        "bg-severity-high/15 text-severity-high"
                      }`}>
                        {p.statusCode}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">{p.responseTime}ms</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-40">{p.title || "—"}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{p.linksCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Code Finder */}
        <TabsContent value="code" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for API endpoints, routes, patterns..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm font-mono"
            />
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {filteredSearch.map(r => (
              <div key={r.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileCode className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground font-mono">{r.file}</span>
                  <span className="text-xs text-muted-foreground">line {r.line}:{r.column}</span>
                </div>
                <div className="bg-muted/50 rounded-md px-3 py-2 font-mono text-xs text-foreground overflow-x-auto">
                  <span className="text-muted-foreground select-none mr-3">{r.line} │</span>
                  {r.context}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Assets */}
        <TabsContent value="assets">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">File</th>
                  <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-right px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Size</th>
                  <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {demoAssets.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground truncate max-w-80">{a.url.split("/").pop()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-muted text-xs font-medium text-muted-foreground">{a.type}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">{formatBytes(a.size)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{a.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tech Stack */}
        <TabsContent value="tech">
          <div className="grid gap-3">
            {demoTechStack.map(t => (
              <div key={t.name} className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <span className="text-xs font-mono text-muted-foreground">{t.version}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.evidence}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${t.confidence}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{t.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
