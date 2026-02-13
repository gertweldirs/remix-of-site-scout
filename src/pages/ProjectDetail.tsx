import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { StatusDot } from "@/components/StatusDot";
import { demoProject, demoCrawlRun, demoPages, demoFindings, demoAssets, demoSearchResults, demoNetworkRequests, demoEndpoints, demoSecrets, demoTechStack, demoGraphNodes, demoGraphEdges } from "@/lib/demo-data";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Globe, Code2, FileCode, Package, Network, Radio, KeyRound, GitFork, CheckCircle2, Play, Loader2, RefreshCw } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { FindingsTab } from "@/components/project/FindingsTab";
import { PagesTab } from "@/components/project/PagesTab";
import { SourcesTab } from "@/components/project/SourcesTab";
import { NetworkTab } from "@/components/project/NetworkTab";
import { AssetsTab } from "@/components/project/AssetsTab";
import { EndpointsTab } from "@/components/project/EndpointsTab";
import { SecretsTab } from "@/components/project/SecretsTab";
import { TechStackTab } from "@/components/project/TechStackTab";
import { GraphTab } from "@/components/project/GraphTab";
import { DetailPanel } from "@/components/project/DetailPanel";
import { AIChat } from "@/components/project/AIChat";
import { useProjectData } from "@/hooks/use-project-data";
import { useCrawl } from "@/hooks/use-crawl";

const ProjectDetail = () => {
  const { id } = useParams();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { startCrawl, crawling, progress } = useCrawl();
  const projectData = useProjectData(id);

  // Use real data if available, fallback to demo
  const project = projectData.project ? {
    ...demoProject,
    id: projectData.project.id,
    name: projectData.project.name,
    startUrl: projectData.project.start_url,
    status: projectData.project.status as any,
  } : demoProject;

  const run = projectData.latestRun ? {
    ...demoCrawlRun,
    id: projectData.latestRun.id,
    status: projectData.latestRun.status as any,
    pagesScanned: projectData.latestRun.pages_scanned,
    errorsCount: projectData.latestRun.errors_count,
    warningsCount: projectData.latestRun.warnings_count,
    consent: projectData.latestRun.consent,
  } : demoCrawlRun;

  const hasRealData = projectData.hasData;

  const pages = hasRealData && projectData.pages.length > 0
    ? projectData.pages.map((p: any) => ({
        id: p.id, url: p.url, statusCode: p.status_code, contentType: p.content_type,
        responseTime: p.response_time, title: p.title, metaDescription: p.meta_description,
        canonical: p.canonical, linksCount: p.links_count, imagesCount: p.images_count,
        scriptsCount: p.scripts_count, stylesheetsCount: p.stylesheets_count,
      }))
    : demoPages;

  const findings = hasRealData && projectData.findings.length > 0
    ? projectData.findings.map((f: any) => ({
        id: f.id, type: f.type, severity: f.severity, title: f.title,
        message: f.message, location: f.location, category: f.category,
      }))
    : demoFindings;

  const assets = hasRealData && projectData.assets.length > 0
    ? projectData.assets.map((a: any) => ({
        id: a.id, url: a.url, type: a.type, size: a.size, hash: a.hash,
      }))
    : demoAssets;

  const endpoints = hasRealData && projectData.endpoints.length > 0
    ? projectData.endpoints.map((e: any) => ({
        id: e.id, url: e.url, method: e.method, type: e.type,
        foundIn: e.found_in, line: e.line, operationName: e.operation_name,
      }))
    : demoEndpoints;

  const secrets = hasRealData && projectData.secretsFound.length > 0
    ? projectData.secretsFound.map((s: any) => ({
        id: s.id, type: s.type, maskedValue: s.masked_value, severity: s.severity,
        location: s.location, line: s.line, snippet: s.context,
        fingerprint: s.hash, confidence: 80,
      }))
    : demoSecrets;

  const techStack = hasRealData && projectData.techStack.length > 0
    ? projectData.techStack.map((t: any) => ({
        name: t.name, version: t.version || "unknown",
        confidence: Math.round(t.confidence * 100),
        evidence: `${t.icon} ${t.category}`,
      }))
    : demoTechStack;

  const networkReqs = hasRealData && projectData.networkRequests.length > 0
    ? projectData.networkRequests.map((r: any) => ({
        id: r.id, method: r.method, url: r.url, statusCode: r.status_code,
        type: r.type, initiator: r.initiator, size: r.size, time: r.timing,
      }))
    : demoNetworkRequests;

  const searchResults = hasRealData && projectData.searchEntries.length > 0
    ? projectData.searchEntries.map((s: any) => ({
        id: s.id, file: s.file, line: s.line, column: s.col,
        match: s.match, context: s.context,
      }))
    : demoSearchResults;

  // Build graph from real data or use demo
  const graphNodes = hasRealData ? buildGraphNodes(pages, assets, endpoints, findings) : demoGraphNodes;
  const graphEdges = hasRealData && projectData.graphEdges.length > 0
    ? projectData.graphEdges.map((e: any) => ({
        source: e.source_id, target: e.target_id, label: e.label,
      }))
    : demoGraphEdges;

  const handleStartCrawl = async () => {
    if (!id) return;
    const result = await startCrawl(id);
    if (result) {
      projectData.refetchAll();
    }
  };

  return (
    <div className="flex h-full">
      <div className={`flex-1 flex flex-col min-w-0 ${selectedItem ? "mr-0" : ""}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50">
          <Link to="/projects" className="p-1 rounded hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <StatusDot status={project.status} />
              <h1 className="text-sm font-bold text-foreground">{project.name}</h1>
              {!hasRealData && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">DEMO</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate">{project.startUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            {crawling ? (
              <span className="flex items-center gap-1.5 text-xs text-primary">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Crawling... {progress?.pagesCrawled || 0} pages
              </span>
            ) : (
              <button
                onClick={handleStartCrawl}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                {hasRealData ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {hasRealData ? "Re-scan" : "Start Crawl"}
              </button>
            )}
            {run.consent && (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="w-3 h-3" /> Consent
              </span>
            )}
            <ExportMenu
              projectName={project.name}
              startUrl={project.startUrl}
              findings={findings}
              pages={pages}
              assets={assets}
              endpoints={endpoints}
              secrets={secrets}
              techStack={techStack}
              networkRequests={networkReqs}
              searchResults={searchResults}
              graphNodes={graphNodes}
              graphEdges={graphEdges}
            />
          </div>
        </div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-border">
          <StatCard label="Pages" value={run.pagesScanned} />
          <StatCard label="Errors" value={run.errorsCount} />
          <StatCard label="Warnings" value={run.warningsCount} />
          <StatCard label="Assets" value={assets.length} />
          <StatCard label="Endpoints" value={endpoints.length} />
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="findings" className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border px-2">
            <TabsList className="bg-transparent h-9 gap-0">
              <TabsTrigger value="findings" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <ShieldCheck className="w-3 h-3 mr-1" /> Findings ({findings.length})
              </TabsTrigger>
              <TabsTrigger value="pages" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Globe className="w-3 h-3 mr-1" /> Pages ({pages.length})
              </TabsTrigger>
              <TabsTrigger value="sources" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Code2 className="w-3 h-3 mr-1" /> Sources
              </TabsTrigger>
              <TabsTrigger value="network" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Network className="w-3 h-3 mr-1" /> Network ({networkReqs.length})
              </TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <FileCode className="w-3 h-3 mr-1" /> Assets ({assets.length})
              </TabsTrigger>
              <TabsTrigger value="endpoints" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Radio className="w-3 h-3 mr-1" /> Endpoints ({endpoints.length})
              </TabsTrigger>
              <TabsTrigger value="secrets" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <KeyRound className="w-3 h-3 mr-1" /> Secrets ({secrets.length})
              </TabsTrigger>
              <TabsTrigger value="tech" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Package className="w-3 h-3 mr-1" /> Tech ({techStack.length})
              </TabsTrigger>
              <TabsTrigger value="graph" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <GitFork className="w-3 h-3 mr-1" /> Graph
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <TabsContent value="findings" className="mt-0">
              <FindingsTab findings={findings} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="pages" className="mt-0">
              <PagesTab pages={pages} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="sources" className="mt-0">
              <SourcesTab results={searchResults} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="network" className="mt-0">
              <NetworkTab requests={networkReqs} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="assets" className="mt-0">
              <AssetsTab assets={assets} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="endpoints" className="mt-0">
              <EndpointsTab endpoints={endpoints} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="secrets" className="mt-0">
              <SecretsTab secrets={secrets} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="tech" className="mt-0">
              <TechStackTab items={techStack} />
            </TabsContent>
            <TabsContent value="graph" className="mt-0">
              <GraphTab nodes={graphNodes} edges={graphEdges} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {selectedItem && (
        <div className="w-80 shrink-0">
          <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
        </div>
      )}

      <AIChat />
    </div>
  );
};

function buildGraphNodes(pages: any[], assets: any[], endpoints: any[], findings: any[]) {
  const nodes: any[] = [];
  pages.slice(0, 10).forEach(p => nodes.push({ id: p.id, type: "page", label: new URL(p.url).pathname || "/" }));
  assets.slice(0, 10).forEach(a => nodes.push({ id: a.id, type: "asset", label: a.url.split("/").pop() || a.url }));
  endpoints.slice(0, 5).forEach(e => nodes.push({ id: e.id, type: "endpoint", label: e.url }));
  findings.slice(0, 5).forEach(f => nodes.push({ id: f.id, type: "finding", label: f.title }));
  return nodes;
}

export default ProjectDetail;
