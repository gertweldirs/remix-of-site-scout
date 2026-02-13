import { Asset } from "@/lib/types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

interface Props {
  assets: Asset[];
  onSelect?: (a: Asset) => void;
}

export function AssetsTab({ assets, onSelect }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-auto max-h-[calc(100vh-280px)]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider">File</th>
            <th className="text-center px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-20">Type</th>
            <th className="text-right px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-16">Size</th>
            <th className="text-left px-2 py-2 font-medium text-muted-foreground uppercase tracking-wider w-24">Hash</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.map(a => (
            <tr key={a.id} onClick={() => onSelect?.(a)} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <td className="px-3 py-2 font-mono text-foreground truncate max-w-72">{a.url.split("/").pop()}</td>
              <td className="px-2 py-2 text-center"><span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.type}</span></td>
              <td className="px-2 py-2 text-right font-mono text-muted-foreground">{formatBytes(a.size)}</td>
              <td className="px-2 py-2 font-mono text-muted-foreground">{a.hash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
