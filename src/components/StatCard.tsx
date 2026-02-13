import { cn } from "@/lib/utils";

export function StatCard({ label, value, subtitle, className }: { 
  label: string; value: string | number; subtitle?: string; className?: string 
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground font-mono">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
