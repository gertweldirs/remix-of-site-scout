import { X } from "lucide-react";

interface Props {
  item: any;
  onClose: () => void;
}

export function DetailPanel({ item, onClose }: Props) {
  if (!item) return null;

  return (
    <div className="border-l border-border bg-card h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-medium text-foreground">Details</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
          {JSON.stringify(item, null, 2)}
        </pre>
      </div>
    </div>
  );
}
