import { PageResult } from "@/lib/types";

interface Props {
  pages: PageResult[];
  onSelect?: (p: PageResult) => void;
}

export function PagesTab({ pages, onSelect }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-auto max-h-[calc(100vh-280px)]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider">URL</th>
            <th className="text-center px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-16">Status</th>
            <th className="text-right px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-16">Time</th>
            <th className="text-left px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider">Title</th>
            <th className="text-center px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-14">Links</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pages.map(p => (
            <tr key={p.id} onClick={() => onSelect?.(p)} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <td className="px-3 py-2 font-mono text-foreground truncate max-w-64">{p.url}</td>
              <td className="px-2 py-2 text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-medium ${p.statusCode < 300 ? "bg-success/15 text-success" : p.statusCode < 400 ? "bg-severity-low/15 text-severity-low" : "bg-severity-high/15 text-severity-high"}`}>
                  {p.statusCode}
                </span>
              </td>
              <td className="px-2 py-2 text-right font-mono text-muted-foreground">{p.responseTime}ms</td>
              <td className="px-2 py-2 text-muted-foreground truncate max-w-32">{p.title || "—"}</td>
              <td className="px-2 py-2 text-center text-muted-foreground">{p.linksCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
