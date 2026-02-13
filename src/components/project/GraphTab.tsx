import { GraphNode, GraphEdge } from "@/lib/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const typeColors: Record<string, string> = {
  page: "bg-severity-info/20 text-severity-info border-severity-info/30",
  asset: "bg-primary/20 text-primary border-primary/30",
  endpoint: "bg-success/20 text-success border-success/30",
  finding: "bg-severity-high/20 text-severity-high border-severity-high/30",
};

export function GraphTab({ nodes, edges }: Props) {
  return (
    <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-auto">
      <p className="text-xs text-muted-foreground">Relationship graph: Page → Assets → Endpoints → Findings</p>
      
      {/* Simple list-based graph visualization */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["page", "asset", "endpoint", "finding"] as const).map(type => {
          const typeNodes = nodes.filter(n => n.type === type);
          return (
            <div key={type} className="rounded-lg border border-border bg-card">
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground uppercase">{type}s ({typeNodes.length})</span>
              </div>
              <div className="p-2 space-y-1.5">
                {typeNodes.map(n => {
                  const outEdges = edges.filter(e => e.source === n.id);
                  return (
                    <div key={n.id} className={`px-2 py-1.5 rounded border text-xs font-mono ${typeColors[type]}`}>
                      <span>{n.label}</span>
                      {outEdges.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {outEdges.map((e, i) => {
                            const target = nodes.find(nn => nn.id === e.target);
                            return (
                              <div key={i} className="text-muted-foreground text-xs pl-2 border-l border-border">
                                → {target?.label} <span className="opacity-60">({e.label})</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
