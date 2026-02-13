import { cn } from "@/lib/utils";
import { Severity } from "@/lib/types";
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from "lucide-react";

const config: Record<Severity, { bg: string; text: string; icon: typeof AlertCircle }> = {
  high: { bg: "bg-severity-high/15", text: "text-severity-high", icon: ShieldAlert },
  medium: { bg: "bg-severity-medium/15", text: "text-severity-medium", icon: AlertTriangle },
  low: { bg: "bg-severity-low/15", text: "text-severity-low", icon: AlertCircle },
  info: { bg: "bg-severity-info/15", text: "text-severity-info", icon: Info },
};

export function SeverityBadge({ severity, showIcon = true }: { severity: Severity; showIcon?: boolean }) {
  const c = config[severity];
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide", c.bg, c.text)}>
      {showIcon && <Icon className="w-3 h-3" />}
      {severity}
    </span>
  );
}
