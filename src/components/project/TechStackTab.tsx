import { TechStackItem } from "@/lib/types";
import { Package } from "lucide-react";

interface Props {
  items: TechStackItem[];
}

export function TechStackTab({ items }: Props) {
  return (
    <div className="grid gap-2 max-h-[calc(100vh-280px)] overflow-auto">
      {items.map(t => (
        <div key={t.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-foreground">{t.name}</p>
              <span className="text-xs font-mono text-muted-foreground">{t.version}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{t.evidence}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${t.confidence}%` }} />
            </div>
            <span className="text-xs font-mono text-muted-foreground">{t.confidence}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
