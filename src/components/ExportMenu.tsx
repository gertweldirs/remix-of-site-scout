import { useState } from "react";
import {
  Download, FileJson, FileSpreadsheet, FileText, Globe, ShieldCheck,
  FileCode, Network, Radio, KeyRound, Package, GitFork, Code2,
  FileDown, Copy, ChevronRight, FileArchive
} from "lucide-react";
import { Finding, PageResult, Asset, Endpoint, SecretFinding, TechStackItem, NetworkRequest, SearchResult, GraphNode, GraphEdge } from "@/lib/types";
import {
  FullExportData,
  exportJSON, exportFullText, exportMarkdown, exportCloneBundle,
  exportHAR, exportURLList, exportDiffReady,
  exportFindingsJSON, exportFindingsCSV,
  exportPagesJSON, exportPagesCSV,
  exportAssetsJSON, exportAssetsCSV,
  exportEndpointsJSON, exportEndpointsCSV,
  exportSecretsJSON, exportTechStackJSON,
  exportNetworkJSON, exportNetworkCSV,
  exportGraphJSON, exportSourcesJSON,
} from "@/lib/export-utils";
import { toast } from "sonner";

interface ExportMenuProps {
  projectName: string;
  startUrl?: string;
  findings: Finding[];
  pages: PageResult[];
  assets: Asset[];
  endpoints?: Endpoint[];
  secrets?: SecretFinding[];
  techStack?: TechStackItem[];
  networkRequests?: NetworkRequest[];
  searchResults?: SearchResult[];
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
}

export const ExportMenu = ({
  projectName, startUrl, findings, pages, assets,
  endpoints = [], secrets = [], techStack = [],
  networkRequests = [], searchResults = [],
  graphNodes = [], graphEdges = [],
}: ExportMenuProps) => {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const data: FullExportData = {
    projectName, startUrl, findings, pages, assets,
    endpoints, secrets, techStack, networkRequests,
    searchResults, graphNodes, graphEdges,
  };

  const doExport = (fn: (d: FullExportData) => void, label: string) => {
    fn(data);
    toast.success(`Exported: ${label}`);
    setOpen(false);
    setExpandedSection(null);
  };

  const toggleSection = (s: string) => {
    setExpandedSection(expandedSection === s ? null : s);
  };

  const sections = [
    { key: "findings", label: "Findings", icon: ShieldCheck, count: findings.length,
      actions: [
        { label: "JSON", fn: exportFindingsJSON, icon: FileJson },
        { label: "CSV", fn: exportFindingsCSV, icon: FileSpreadsheet },
      ]},
    { key: "pages", label: "Pages", icon: Globe, count: pages.length,
      actions: [
        { label: "JSON", fn: exportPagesJSON, icon: FileJson },
        { label: "CSV", fn: exportPagesCSV, icon: FileSpreadsheet },
      ]},
    { key: "assets", label: "Assets", icon: FileCode, count: assets.length,
      actions: [
        { label: "JSON", fn: exportAssetsJSON, icon: FileJson },
        { label: "CSV", fn: exportAssetsCSV, icon: FileSpreadsheet },
      ]},
    { key: "endpoints", label: "Endpoints", icon: Radio, count: endpoints.length,
      actions: [
        { label: "JSON", fn: exportEndpointsJSON, icon: FileJson },
        { label: "CSV", fn: exportEndpointsCSV, icon: FileSpreadsheet },
      ]},
    { key: "secrets", label: "Secrets", icon: KeyRound, count: secrets.length,
      actions: [
        { label: "JSON (masked)", fn: exportSecretsJSON, icon: FileJson },
      ]},
    { key: "tech", label: "Tech Stack", icon: Package, count: techStack.length,
      actions: [
        { label: "JSON", fn: exportTechStackJSON, icon: FileJson },
      ]},
    { key: "network", label: "Network", icon: Network, count: networkRequests.length,
      actions: [
        { label: "JSON", fn: exportNetworkJSON, icon: FileJson },
        { label: "CSV", fn: exportNetworkCSV, icon: FileSpreadsheet },
        { label: "HAR", fn: exportHAR, icon: FileDown },
      ]},
    { key: "sources", label: "Sources", icon: Code2, count: searchResults.length,
      actions: [
        { label: "JSON", fn: exportSourcesJSON, icon: FileJson },
      ]},
    { key: "graph", label: "Graph", icon: GitFork, count: graphEdges.length,
      actions: [
        { label: "JSON", fn: exportGraphJSON, icon: FileJson },
      ]},
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setExpandedSection(null); }} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground">Export Scan Data</p>
              <p className="text-[10px] text-muted-foreground">Choose format and scope</p>
            </div>

            {/* Full exports */}
            <div className="p-1.5 border-b border-border space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Complete Report</p>
              <button onClick={() => doExport(exportJSON, "Complete JSON")}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors">
                <FileJson className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">Full JSON</span>
                <span className="text-[10px] text-muted-foreground">all data</span>
              </button>
              <button onClick={() => doExport(exportFullText, "Full Text Report")}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">Full Text Report</span>
                <span className="text-[10px] text-muted-foreground">.txt</span>
              </button>
              <button onClick={() => doExport(exportMarkdown, "Markdown Report")}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">Markdown Report</span>
                <span className="text-[10px] text-muted-foreground">.md</span>
              </button>
            </div>

            {/* Special exports */}
            <div className="p-1.5 border-b border-border space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Special</p>
              <button onClick={() => doExport(exportCloneBundle, "Clone Bundle")}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors">
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">Website Clone Bundle</span>
                <span className="text-[10px] text-muted-foreground">.html</span>
              </button>
              <button onClick={() => doExport(exportHAR, "HAR Archive")}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors">
                <FileArchive className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">HAR Network Archive</span>
                <span className="text-[10px] text-muted-foreground">.har</span>
              </button>
              <button onClick={() => doExport(exportURLList, "URL List")}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">URL List</span>
                <span className="text-[10px] text-muted-foreground">.txt</span>
              </button>
              <button onClick={() => doExport(exportDiffReady, "Diff Snapshot")}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors">
                <FileDown className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 text-left">Diff Snapshot</span>
                <span className="text-[10px] text-muted-foreground">compare scans</span>
              </button>
            </div>

            {/* Per-section exports */}
            <div className="p-1.5 max-h-64 overflow-auto">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Individual Sections</p>
              {sections.map(sec => (
                <div key={sec.key}>
                  <button
                    onClick={() => toggleSection(sec.key)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <sec.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="flex-1 text-left">{sec.label}</span>
                    <span className="text-[10px] text-muted-foreground">{sec.count}</span>
                    <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expandedSection === sec.key ? "rotate-90" : ""}`} />
                  </button>
                  {expandedSection === sec.key && (
                    <div className="ml-6 space-y-0.5 mb-1">
                      {sec.actions.map(a => (
                        <button
                          key={a.label}
                          onClick={() => doExport(a.fn, `${sec.label} ${a.label}`)}
                          className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                        >
                          <a.icon className="w-3 h-3" />
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
