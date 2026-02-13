import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCrawl() {
  const [crawling, setCrawling] = useState(false);
  const [progress, setProgress] = useState<{ pagesCrawled: number; status: string } | null>(null);

  const startCrawl = async (projectId: string) => {
    setCrawling(true);
    setProgress({ pagesCrawled: 0, status: "starting" });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to start a crawl");
        setCrawling(false);
        return null;
      }

      toast.info("Crawl started! This may take a few minutes...");
      setProgress({ pagesCrawled: 0, status: "running" });

      const resp = await supabase.functions.invoke("crawl-orchestrator", {
        body: { projectId },
      });

      if (resp.error) {
        toast.error(resp.error.message || "Crawl failed");
        setCrawling(false);
        setProgress(null);
        return null;
      }

      const result = resp.data;
      setProgress({ pagesCrawled: result.pagesCrawled, status: "completed" });
      toast.success(`Crawl completed! ${result.pagesCrawled} pages scanned.`);
      setCrawling(false);
      return result;
    } catch (err) {
      toast.error("Failed to start crawl");
      setCrawling(false);
      setProgress(null);
      return null;
    }
  };

  return { startCrawl, crawling, progress };
}
