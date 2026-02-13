import { useState, useCallback } from "react";
import { Camera, Download, Loader2, Image, Film, Music, CheckSquare, Square, X, DownloadCloud } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MediaItem {
  url: string;
  type: "image" | "video" | "audio";
  alt?: string;
  poster?: string;
  sourceTag: string;
  foundOn: string;
}

interface Props {
  pageUrls: string[];
  projectName: string;
}

type FilterType = "all" | "image" | "video" | "audio";

export function MediaScanner({ pageUrls, projectName }: Props) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [scanned, setScanned] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (pageUrls.length === 0) {
      toast.error("No pages to scan. Run a crawl first.");
      return;
    }
    setScanning(true);
    setMedia([]);
    setSelected(new Set());
    try {
      // Scan in batches of 20
      const allMedia: MediaItem[] = [];
      for (let i = 0; i < pageUrls.length; i += 20) {
        const batch = pageUrls.slice(i, i + 20);
        const { data, error } = await supabase.functions.invoke("scan-media", {
          body: { urls: batch },
        });
        if (error) throw error;
        if (data?.media) allMedia.push(...data.media);
      }
      // Deduplicate
      const seen = new Set<string>();
      const unique = allMedia.filter(m => {
        if (seen.has(m.url)) return false;
        seen.add(m.url);
        return true;
      });
      setMedia(unique);
      setScanned(true);
      toast.success(`Found ${unique.length} media items across ${pageUrls.length} pages`);
    } catch (e) {
      console.error(e);
      toast.error("Media scan failed");
    } finally {
      setScanning(false);
    }
  }, [pageUrls]);

  const filtered = filter === "all" ? media : media.filter(m => m.type === filter);
  const counts = {
    all: media.length,
    image: media.filter(m => m.type === "image").length,
    video: media.filter(m => m.type === "video").length,
    audio: media.filter(m => m.type === "audio").length,
  };

  const toggleSelect = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(m => m.url)));
    }
  };

  const downloadOne = async (url: string, filename?: string) => {
    setDownloading(url);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || url.split("/").pop()?.split("?")[0] || "media";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    } finally {
      setDownloading(null);
    }
  };

  const downloadSelected = async () => {
    const urls = Array.from(selected);
    if (urls.length === 0) {
      toast.error("Select items first");
      return;
    }
    toast.info(`Downloading ${urls.length} files...`);
    for (const url of urls) {
      await downloadOne(url);
      await new Promise(r => setTimeout(r, 300));
    }
    toast.success(`Downloaded ${urls.length} files`);
  };

  const downloadAll = async () => {
    toast.info(`Downloading all ${filtered.length} files...`);
    for (const item of filtered) {
      await downloadOne(item.url);
      await new Promise(r => setTimeout(r, 300));
    }
    toast.success(`Downloaded ${filtered.length} files`);
  };

  const exportUrlList = () => {
    const text = filtered.map(m => m.url).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName}-media-urls.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported URL list");
  };

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "video") return <Film className="w-3 h-3 text-primary" />;
    if (type === "audio") return <Music className="w-3 h-3 text-accent-foreground" />;
    return <Image className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors">
          <Camera className="w-3.5 h-3.5" />
          Media
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Camera className="w-4 h-4 text-primary" />
            Media Scanner
          </SheetTitle>
        </SheetHeader>

        {/* Controls */}
        <div className="px-4 py-2 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={scan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {scanning ? "Scanning..." : scanned ? "Re-scan" : "Scan for Media"}
            </button>
            <span className="text-[10px] text-muted-foreground">
              {pageUrls.length} pages to scan
            </span>
          </div>

          {scanned && (
            <>
              {/* Filter tabs */}
              <div className="flex gap-1">
                {(["all", "image", "video", "audio"] as FilterType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "image" && <Image className="w-2.5 h-2.5" />}
                    {t === "video" && <Film className="w-2.5 h-2.5" />}
                    {t === "audio" && <Music className="w-2.5 h-2.5" />}
                    {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
                  </button>
                ))}
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={selectAll} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                  {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                  {selected.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}
                </button>
                {selected.size > 0 && (
                  <button onClick={downloadSelected}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20">
                    <Download className="w-2.5 h-2.5" /> Download selected ({selected.size})
                  </button>
                )}
                <button onClick={downloadAll}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium hover:text-foreground">
                  <DownloadCloud className="w-2.5 h-2.5" /> Download all
                </button>
                <button onClick={exportUrlList}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium hover:text-foreground">
                  Export URLs
                </button>
              </div>
            </>
          )}
        </div>

        {/* Media grid */}
        <div className="flex-1 overflow-auto p-3">
          {!scanned ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Camera className="w-8 h-8 opacity-30" />
              <p className="text-xs">Click "Scan for Media" to find all images, videos & audio</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Image className="w-8 h-8 opacity-30" />
              <p className="text-xs">No {filter === "all" ? "media" : filter} found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((item) => (
                <div
                  key={item.url}
                  className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                    selected.has(item.url) ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => toggleSelect(item.url)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.alt || ""}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="flex items-center justify-center h-full text-muted-foreground"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }}
                      />
                    ) : item.type === "video" ? (
                      item.poster ? (
                        <img src={item.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Film className="w-6 h-6" />
                          <span className="text-[8px]">VIDEO</span>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Music className="w-6 h-6" />
                        <span className="text-[8px]">AUDIO</span>
                      </div>
                    )}
                  </div>

                  {/* Type badge */}
                  <div className="absolute top-1 left-1">
                    <TypeIcon type={item.type} />
                  </div>

                  {/* Selection indicator */}
                  <div className="absolute top-1 right-1">
                    {selected.has(item.url) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  {/* Download button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadOne(item.url); }}
                    className="absolute bottom-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    {downloading === item.url ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    ) : (
                      <Download className="w-3 h-3 text-foreground" />
                    )}
                  </button>

                  {/* Filename */}
                  <div className="px-1 py-0.5 bg-card">
                    <p className="text-[8px] text-muted-foreground truncate font-mono">
                      {item.url.split("/").pop()?.split("?")[0] || "file"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
