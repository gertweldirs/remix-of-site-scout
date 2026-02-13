import { cn } from "@/lib/utils";

export function StatusDot({ status }: { status: string }) {
  const color = {
    completed: "bg-success",
    running: "bg-primary animate-pulse-glow",
    failed: "bg-destructive",
    idle: "bg-muted-foreground",
    cancelled: "bg-muted-foreground",
  }[status] || "bg-muted-foreground";

  return <span className={cn("inline-block w-2 h-2 rounded-full", color)} />;
}
