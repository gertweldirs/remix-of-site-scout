import { SecretFinding } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { ShieldAlert } from "lucide-react";

interface Props {
  secrets: SecretFinding[];
  onSelect?: (s: SecretFinding) => void;
}

export function SecretsTab({ secrets, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-severity-medium/30 bg-severity-medium/5 p-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-severity-medium" />
          <p className="text-xs text-muted-foreground">Values are always masked. Only fingerprints (SHA-256) are shown for verification. Exports also mask all secrets.</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-auto max-h-[calc(100vh-320px)]">
        {secrets.map(s => (
          <button key={s.id} onClick={() => onSelect?.(s)} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
            <SeverityBadge severity={s.severity} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-foreground">{s.type}</p>
                <span className="text-xs text-muted-foreground font-mono">confidence: {s.confidence}%</span>
              </div>
              <div className="bg-muted/50 rounded px-2 py-1 mt-1 font-mono text-xs text-foreground overflow-x-auto">
                <span className="text-muted-foreground select-none mr-2">{s.line} │</span>
                {s.snippet}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground font-mono">{s.location}</span>
                <span className="text-xs text-muted-foreground font-mono">🔑 {s.fingerprint}</span>
              </div>
            </div>
          </button>
        ))}
        {secrets.length === 0 && <p className="px-4 py-6 text-xs text-muted-foreground text-center">No secrets detected</p>}
      </div>
    </div>
  );
}
