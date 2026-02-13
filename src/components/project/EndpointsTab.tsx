import { Endpoint } from "@/lib/types";
import { useState } from "react";

interface Props {
  endpoints: Endpoint[];
  onSelect?: (e: Endpoint) => void;
}

export function EndpointsTab({ endpoints, onSelect }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const types = ["all", "rest", "graphql", "websocket"];
  const filtered = endpoints.filter(e => typeFilter === "all" || e.type === typeFilter);

  // Group by host/path
  const grouped = filtered.reduce((acc, ep) => {
    const host = ep.url.startsWith("wss://") || ep.url.startsWith("ws://") ? new URL(ep.url).host : "same-origin";
    if (!acc[host]) acc[host] = [];
    acc[host].push(ep);
    return acc;
  }, {} as Record<string, Endpoint[]>);

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {types.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${typeFilter === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {t === "all" ? "All" : t.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-auto">
        {Object.entries(grouped).map(([host, eps]) => (
          <div key={host} className="rounded-lg border border-border bg-card">
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-xs font-mono font-medium text-muted-foreground">{host}</span>
            </div>
            <div className="divide-y divide-border">
              {eps.map(ep => (
                <button key={ep.id} onClick={() => onSelect?.(ep)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors text-left">
                  <span className={`px-1.5 py-0.5 rounded font-mono text-xs font-medium ${
                    ep.method === "GET" ? "bg-success/15 text-success" :
                    ep.method === "POST" ? "bg-severity-info/15 text-severity-info" :
                    ep.method === "WS" ? "bg-severity-medium/15 text-severity-medium" :
                    "bg-muted text-muted-foreground"
                  }`}>{ep.method}</span>
                  <span className="text-xs font-mono text-foreground flex-1 truncate">{ep.url}</span>
                  {ep.operationName && <span className="text-xs text-primary font-mono">{ep.operationName}</span>}
                  <span className="text-xs text-muted-foreground">{ep.foundIn}:{ep.line}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
