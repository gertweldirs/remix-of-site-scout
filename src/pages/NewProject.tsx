import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useCreateProject } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";

const NewProject = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [agreed, setAgreed] = useState(false);
  const [respectRobots, setRespectRobots] = useState(true);
  const [sameDomain, setSameDomain] = useState(true);
  const [followRedirects, setFollowRedirects] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value || "Untitled Project";
    const startUrl = (form.elements.namedItem("url") as HTMLInputElement).value;
    const maxDepth = parseInt((form.elements.namedItem("depth") as HTMLInputElement).value) || 3;
    const maxPages = parseInt((form.elements.namedItem("pages") as HTMLInputElement).value) || 200;
    const concurrency = parseInt((form.elements.namedItem("concurrency") as HTMLInputElement).value) || 2;
    const crawlDelay = parseInt((form.elements.namedItem("delay") as HTMLInputElement).value) || 1000;
    const userAgent = (form.elements.namedItem("ua") as HTMLInputElement).value || "SiteInspector/1.0";
    const excludeRaw = (form.elements.namedItem("exclude") as HTMLInputElement).value;
    const includeRaw = (form.elements.namedItem("include") as HTMLInputElement).value;

    if (!startUrl) {
      toast({ title: "Start URL is required", variant: "destructive" });
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        name,
        start_url: startUrl,
        max_depth: maxDepth,
        max_pages: maxPages,
        concurrency,
        crawl_delay: crawlDelay,
        user_agent: userAgent,
        respect_robots: respectRobots,
        same_domain_only: sameDomain,
        follow_redirects: followRedirects,
        exclude_patterns: excludeRaw ? excludeRaw.split(",").map(s => s.trim()) : [],
        include_patterns: includeRaw ? includeRaw.split(",").map(s => s.trim()) : [],
      });
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      toast({ title: "Error creating project", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Project</h1>
        <p className="text-sm text-muted-foreground">Configure a new website inspection</p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg border border-severity-medium/30 bg-severity-medium/5 p-4"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-severity-medium shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Responsible Use Disclaimer</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Only scan websites you own or have explicit permission to test. SiteInspector respects
              robots.txt by default, enforces rate limiting, and does not bypass authentication or
              anti-bot protections. This tool is for auditing and observability purposes only.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
              <Label htmlFor="agree" className="text-xs text-foreground cursor-pointer">
                I confirm I have permission to scan the target website
              </Label>
            </div>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input id="name" placeholder="My Website Audit" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Start URL</Label>
            <Input id="url" placeholder="https://example.com" className="font-mono text-sm" required />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="depth">Max Depth</Label>
            <Input id="depth" type="number" defaultValue={3} min={1} max={10} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pages">Max Pages</Label>
            <Input id="pages" type="number" defaultValue={200} min={1} max={10000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concurrency">Concurrency</Label>
            <Input id="concurrency" type="number" defaultValue={2} min={1} max={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay">Crawl Delay (ms)</Label>
            <Input id="delay" type="number" defaultValue={1000} min={0} max={5000} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ua">User Agent</Label>
          <Input id="ua" defaultValue="SiteInspector/1.0" className="font-mono text-sm" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="exclude">Exclude Patterns</Label>
            <Input id="exclude" placeholder="/admin/*, /api/*" className="font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="include">Include Patterns</Label>
            <Input id="include" placeholder="(optional)" className="font-mono text-xs" />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch id="robots" checked={respectRobots} onCheckedChange={setRespectRobots} />
            <Label htmlFor="robots" className="text-sm">Respect robots.txt</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sameDomain" checked={sameDomain} onCheckedChange={setSameDomain} />
            <Label htmlFor="sameDomain" className="text-sm">Same domain only</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="redirects" checked={followRedirects} onCheckedChange={setFollowRedirects} />
            <Label htmlFor="redirects" className="text-sm">Follow redirects</Label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!agreed || createProject.isPending}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          {createProject.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Project & Start Crawl
        </button>
      </form>
    </div>
  );
};

export default NewProject;
