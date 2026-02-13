import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const NewProject = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [respectRobots, setRespectRobots] = useState(true);
  const [sameDomain, setSameDomain] = useState(true);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [renderPass, setRenderPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxPages, setMaxPages] = useState(200);
  const [concurrency, setConcurrency] = useState(2);
  const [crawlDelay, setCrawlDelay] = useState(1000);
  const [userAgent, setUserAgent] = useState("SiteInspector/1.0");
  const [excludePatterns, setExcludePatterns] = useState("");
  const [includePatterns, setIncludePatterns] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !session?.user?.id) return;

    let formattedUrl = startUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("projects").insert({
        name: name || "Untitled Project",
        start_url: formattedUrl,
        max_depth: maxDepth,
        max_pages: maxPages,
        concurrency,
        crawl_delay: crawlDelay,
        user_agent: userAgent,
        same_domain_only: sameDomain,
        respect_robots: respectRobots,
        follow_redirects: followRedirects,
        exclude_patterns: excludePatterns ? excludePatterns.split(",").map(s => s.trim()) : [],
        include_patterns: includePatterns ? includePatterns.split(",").map(s => s.trim()) : [],
        user_id: session.user.id,
        status: "idle",
      }).select().single();

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Project created!");
      navigate(`/projects/${data.id}`);
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Project</h1>
        <p className="text-sm text-muted-foreground">Configure a new website inspection</p>
      </div>

      {/* Disclaimer */}
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
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
              />
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
            <Input id="name" placeholder="My Website Audit" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Start URL</Label>
            <Input id="url" placeholder="https://example.com" className="font-mono text-sm" value={startUrl} onChange={e => setStartUrl(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="depth">Max Depth</Label>
            <Input id="depth" type="number" value={maxDepth} onChange={e => setMaxDepth(Number(e.target.value))} min={1} max={10} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pages">Max Pages</Label>
            <Input id="pages" type="number" value={maxPages} onChange={e => setMaxPages(Number(e.target.value))} min={1} max={10000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concurrency">Concurrency</Label>
            <Input id="concurrency" type="number" value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} min={1} max={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay">Crawl Delay (ms)</Label>
            <Input id="delay" type="number" value={crawlDelay} onChange={e => setCrawlDelay(Number(e.target.value))} min={0} max={5000} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ua">User Agent</Label>
          <Input id="ua" value={userAgent} onChange={e => setUserAgent(e.target.value)} className="font-mono text-sm" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="exclude">Exclude Patterns</Label>
            <Input id="exclude" placeholder="/admin/*, /api/*" className="font-mono text-xs" value={excludePatterns} onChange={e => setExcludePatterns(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="include">Include Patterns</Label>
            <Input id="include" placeholder="(optional)" className="font-mono text-xs" value={includePatterns} onChange={e => setIncludePatterns(e.target.value)} />
          </div>
        </div>

        {/* Toggle options */}
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
          <div className="flex items-center gap-2">
            <Switch id="renderPass" checked={renderPass} onCheckedChange={setRenderPass} />
            <Label htmlFor="renderPass" className="text-sm">Render pass (headless browser)</Label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!agreed || loading}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Creating..." : "Create Project & Start Crawl"}
        </button>
      </form>
    </div>
  );
};

export default NewProject;
