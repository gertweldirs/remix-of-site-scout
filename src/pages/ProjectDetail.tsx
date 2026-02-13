import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { StatusDot } from "@/components/StatusDot";
import { demoProject, demoCrawlRun, demoPages, demoFindings, demoAssets, demoSearchResults, demoNetworkRequests, demoEndpoints, demoSecrets, demoTechStack, demoGraphNodes, demoGraphEdges } from "@/lib/demo-data";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Globe, Code2, FileCode, Package, Network, Radio, KeyRound, GitFork, CheckCircle2 } from "lucide-react";
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

const ProjectDetail = () => {
  const { id } = useParams();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const project = demoProject;
  const run = demoCrawlRun;

  return (
    <div className="flex h-full">
      {/* Main content */}
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
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate">{project.startUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            {run.consent && (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="w-3 h-3" /> Consent
              </span>
            )}
            <ExportMenu projectName={project.name} findings={demoFindings} pages={demoPages} assets={demoAssets} />
          </div>
        </div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-border">
          <StatCard label="Pages" value={run.pagesScanned} />
          <StatCard label="Errors" value={run.errorsCount} />
          <StatCard label="Warnings" value={run.warningsCount} />
          <StatCard label="Duration" value="7m 34s" />
          <StatCard label="Assets" value={demoAssets.length} />
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="findings" className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border px-2">
            <TabsList className="bg-transparent h-9 gap-0">
              <TabsTrigger value="findings" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <ShieldCheck className="w-3 h-3 mr-1" /> Findings
              </TabsTrigger>
              <TabsTrigger value="pages" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Globe className="w-3 h-3 mr-1" /> Pages
              </TabsTrigger>
              <TabsTrigger value="sources" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Code2 className="w-3 h-3 mr-1" /> Sources
              </TabsTrigger>
              <TabsTrigger value="network" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Network className="w-3 h-3 mr-1" /> Network
              </TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <FileCode className="w-3 h-3 mr-1" /> Assets
              </TabsTrigger>
              <TabsTrigger value="endpoints" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Radio className="w-3 h-3 mr-1" /> Endpoints
              </TabsTrigger>
              <TabsTrigger value="secrets" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <KeyRound className="w-3 h-3 mr-1" /> Secrets
              </TabsTrigger>
              <TabsTrigger value="tech" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <Package className="w-3 h-3 mr-1" /> Tech
              </TabsTrigger>
              <TabsTrigger value="graph" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                <GitFork className="w-3 h-3 mr-1" /> Graph
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <TabsContent value="findings" className="mt-0">
              <FindingsTab findings={demoFindings} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="pages" className="mt-0">
              <PagesTab pages={demoPages} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="sources" className="mt-0">
              <SourcesTab results={demoSearchResults} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="network" className="mt-0">
              <NetworkTab requests={demoNetworkRequests} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="assets" className="mt-0">
              <AssetsTab assets={demoAssets} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="endpoints" className="mt-0">
              <EndpointsTab endpoints={demoEndpoints} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="secrets" className="mt-0">
              <SecretsTab secrets={demoSecrets} onSelect={setSelectedItem} />
            </TabsContent>
            <TabsContent value="tech" className="mt-0">
              <TechStackTab items={demoTechStack} />
            </TabsContent>
            <TabsContent value="graph" className="mt-0">
              <GraphTab nodes={demoGraphNodes} edges={demoGraphEdges} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="w-80 shrink-0">
          <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
        </div>
      )}

      {/* AI Chat */}
      <AIChat />
    </div>
  );
};

export default ProjectDetail;
