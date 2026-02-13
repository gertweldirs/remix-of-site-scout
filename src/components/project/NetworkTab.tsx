import { useState } from "react";
import { NetworkRequest } from "@/lib/types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

interface Props {
  requests: NetworkRequest[];
  onSelect?: (r: NetworkRequest) => void;
}

export function NetworkTab({ requests, onSelect }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const types = ["all", "document", "script", "stylesheet", "fetch", "xhr", "image", "font", "websocket"];
  const filtered = requests.filter(r => typeFilter === "all" || r.type === typeFilter);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${typeFilter === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider w-14">Method</th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider">URL</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-14">Status</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-16">Type</th>
              <th className="text-right px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-16">Size</th>
              <th className="text-right px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-14">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(r => (
              <tr key={r.id} onClick={() => onSelect?.(r)} className="hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-3 py-2 font-mono font-medium text-foreground">{r.method}</td>
                <td className="px-2 py-2 font-mono text-foreground truncate max-w-72">{r.url}</td>
                <td className="px-2 py-2 text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-medium ${r.statusCode < 300 ? "bg-success/15 text-success" : r.statusCode < 400 ? "bg-severity-low/15 text-severity-low" : "bg-severity-high/15 text-severity-high"}`}>
                    {r.statusCode}
                  </span>
                </td>
                <td className="px-2 py-2 text-center"><span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r.type}</span></td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">{formatBytes(r.size)}</td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">{r.time}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
