import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, FileCode } from "lucide-react";
import { SearchResult } from "@/lib/types";

interface Props {
  results: SearchResult[];
  onSelect?: (r: SearchResult) => void;
}

export function SourcesTab({ results, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const filtered = results.filter(r =>
    !search || r.match.toLowerCase().includes(search.toLowerCase()) || r.context.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search code: endpoints, patterns, regex..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs font-mono" />
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-auto max-h-[calc(100vh-280px)]">
        {filtered.map(r => (
          <button key={r.id} onClick={() => onSelect?.(r)} className="w-full px-3 py-2.5 hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-2 mb-1">
              <FileCode className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-foreground font-mono">{r.file}</span>
              <span className="text-xs text-muted-foreground">:{r.line}:{r.column}</span>
            </div>
            <div className="bg-muted/50 rounded px-2.5 py-1.5 font-mono text-xs text-foreground overflow-x-auto">
              <span className="text-muted-foreground select-none mr-2">{r.line} │</span>
              {r.context}
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="px-4 py-6 text-xs text-muted-foreground text-center">No results</p>}
      </div>
    </div>
  );
}
