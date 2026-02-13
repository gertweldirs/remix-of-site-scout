import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Search } from "lucide-react";
import { Finding, Severity } from "@/lib/types";

interface Props {
  findings: Finding[];
  onSelect?: (f: Finding) => void;
}

export function FindingsTab({ findings, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Severity | "all">("all");

  const filtered = findings.filter(f => {
    if (filter !== "all" && f.severity !== filter) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search findings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <div className="flex gap-1">
          {(["all", "high", "medium", "low", "info"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filter === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-auto max-h-[calc(100vh-280px)]">
        {filtered.map(f => (
          <button key={f.id} onClick={() => onSelect?.(f)} className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left">
            <SeverityBadge severity={f.severity} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.message}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-muted-foreground font-mono">{f.category}</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="px-4 py-6 text-xs text-muted-foreground text-center">No findings match</p>}
      </div>
    </div>
  );
}
