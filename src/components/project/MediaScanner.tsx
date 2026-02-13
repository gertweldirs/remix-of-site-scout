import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Camera, Download, Loader2, Image, Film, Music, CheckSquare, Square, X, Play, ZoomIn, FileArchive, Globe, ExternalLink, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";
import Hls from "hls.js";

interface MediaItem {
  url: string;
  type: "image" | "video" | "audio";
  alt?: string;
  poster?: string;
  sourceTag: string;
  foundOn: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  streamUrl?: string;
}

function HlsVideo({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS error:', data.type, data.details);
        if (data.fatal) {
          // Try direct playback as fallback
          video.src = src;
          video.play().catch(() => {});
        }
      });
      return () => hls.destroy();
    } else {
      // Safari supports HLS natively, or it's a direct MP4
      video.src = src;
      video.play().catch(() => {});
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      poster={poster}
      className="max-w-full max-h-[70vh] rounded"
      playsInline
    />
  );
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
  const [zipping, setZipping] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [browseMode, setBrowseMode] = useState(false);
  const [browseUrl, setBrowseUrl] = useState("");
  const [browseInput, setBrowseInput] = useState("");
  const [scanningUrl, setScanningUrl] = useState(false);
  const LOAD_BATCH = 20;

  const scan = useCallback(async () => {
    if (pageUrls.length === 0) {
      toast.error("No pages to scan. Run a crawl first.");
      return;
    }
    setScanning(true);
    setMedia([]);
    setSelected(new Set());
    setVisibleCount(LOAD_BATCH);
    try {
      const allMedia: MediaItem[] = [];
      for (let i = 0; i < pageUrls.length; i += 20) {
        const batch = pageUrls.slice(i, i + 20);
        const { data, error } = await supabase.functions.invoke("scan-media", {
          body: { urls: batch },
        });
        if (error) throw error;
        if (data?.media) allMedia.push(...data.media);
      }
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

  const filtered = useMemo(() => filter === "all" ? media : media.filter(m => m.type === filter), [media, filter]);
  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;
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

  const proxyFetch = async (item: MediaItem): Promise<Blob> => {
    const url = item.downloadUrl || item.url;
    // Try direct fetch first
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (resp.ok) return await resp.blob();
    } catch { /* CORS blocked, use proxy */ }
    
    // Try proxy with referer
    try {
      const { data, error } = await supabase.functions.invoke("media-proxy", {
        body: { url, refererUrl: item.foundOn },
      });
      if (!error && data instanceof Blob && data.size > 0) return data;
    } catch { /* proxy failed */ }
    
    // For images, try the main url (not downloadUrl) which may be on a CDN
    if (item.type === 'image' && item.downloadUrl && item.url !== item.downloadUrl) {
      try {
        const resp = await fetch(item.url, { mode: 'cors' });
        if (resp.ok) return await resp.blob();
      } catch { /* also blocked */ }
    }

    // For videos with stream URL, try proxying that
    if (item.streamUrl) {
      try {
        const { data, error } = await supabase.functions.invoke("media-proxy", {
          body: { url: item.streamUrl, refererUrl: item.foundOn },
        });
        if (!error && data instanceof Blob && data.size > 0) return data;
      } catch { /* proxy failed */ }
    }
    
    throw new Error('Download blocked');
  };

  const downloadOne = async (item: MediaItem) => {
    const url = item.downloadUrl || item.url;
    setDownloading(url);
    try {
      const blob = await proxyFetch(item);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = url.split("/").pop()?.split("?")[0] || "media";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // For videos, open the download URL or stream URL in new tab
      const fallbackUrl = item.downloadUrl || item.streamUrl || item.url;
      window.open(fallbackUrl, "_blank");
      toast.info("Opened in new tab — your browser may be able to download it directly.");
    } finally {
      setDownloading(null);
    }
  };

  const downloadAsZip = async (items: MediaItem[]) => {
    if (items.length === 0) {
      toast.error("No items to download");
      return;
    }
    setZipping(true);
    const toastId = toast.loading(`Downloading ${items.length} files for ZIP...`);
    try {
      const zip = new JSZip();
      const nameCount: Record<string, number> = {};

      await Promise.all(
        items.map(async (item) => {
          try {
            const resp = await proxyFetch(item);
            const blob = resp;
            const url = item.downloadUrl || item.url;
            let name = url.split("/").pop()?.split("?")[0] || "file";
            // Deduplicate filenames
            if (nameCount[name] !== undefined) {
              nameCount[name]++;
              const ext = name.includes(".") ? "." + name.split(".").pop() : "";
              const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
              name = `${base}_${nameCount[name]}${ext}`;
            } else {
              nameCount[name] = 0;
            }
            zip.file(name, blob);
          } catch {
            // Skip failed files
          }
        })
      );

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${projectName}-media.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`ZIP downloaded with ${Object.keys(zip.files).length} files`, { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("ZIP download failed", { id: toastId });
    } finally {
      setZipping(false);
    }
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

  const scanSingleUrl = useCallback(async (url: string, paginate = false) => {
    if (!url) return;
    setScanningUrl(true);
    try {
      toast.info(paginate ? "Scanning all pages with headless browser..." : "Scanning with headless browser for original quality media...", { duration: 4000 });
      const { data: fcData, error: fcError } = await supabase.functions.invoke("firecrawl-scrape", {
        body: { url, paginate, maxPages: 20 },
      });
      
      let newItems: MediaItem[] = [];
      if (fcError) {
        console.warn("Firecrawl failed, falling back to standard scan:", fcError);
        const { data, error } = await supabase.functions.invoke("scan-media", {
          body: { urls: [url] },
        });
        if (error) throw error;
        newItems = (data?.media || []) as MediaItem[];
      } else if (fcData?.media) {
        newItems = fcData.media as MediaItem[];
      }

      if (newItems.length === 0) {
        toast.info("No media found on this page.", { duration: 5000 });
      } else {
        const originals = newItems.filter(m => m.sourceTag === 'gallery-original' || m.sourceTag === 'gallery-video').length;
        const pages = fcData?.scannedPages || 1;
        setMedia(prev => {
          const seen = new Set(prev.map(m => m.url));
          const unique = newItems.filter(m => !seen.has(m.url));
          return [...prev, ...unique];
        });
        setScanned(true);
        toast.success(`Found ${newItems.length} media items${originals > 0 ? ` (${originals} originals)` : ''}${pages > 1 ? ` across ${pages} pages` : ''}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Scan failed for this URL");
    } finally {
      setScanningUrl(false);
    }
  }, []);

  const startBrowse = () => {
    if (!browseInput.trim()) return;
    let url = browseInput.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setBrowseUrl(url);
    setBrowseMode(true);
  };

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "video") return <Film className="w-3 h-3 text-primary" />;
    if (type === "audio") return <Music className="w-3 h-3 text-accent-foreground" />;
    return <Image className="w-3 h-3 text-muted-foreground" />;
  };

  const openPreview = (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(item);
  };

  return (
    <>
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={scan}
                disabled={scanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                {scanning ? "Scanning..." : scanned ? "Re-scan" : "Scan Pages"}
              </button>
              <button
                onClick={() => setBrowseMode(!browseMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  browseMode ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Browse & Scan
              </button>
              <span className="text-[10px] text-muted-foreground">
                {pageUrls.length} pages · {media.length} media found
              </span>
            </div>

            {/* Mini Browser URL bar */}
            {browseMode && (
              <div className="flex items-center gap-2">
                <Input
                  value={browseInput}
                  onChange={(e) => setBrowseInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startBrowse()}
                  placeholder="Enter URL to browse & scan (e.g. https://example.com)"
                  className="h-8 text-xs font-mono flex-1"
                />
                <button
                  onClick={startBrowse}
                  disabled={!browseInput.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  <Globe className="w-3 h-3" /> Go
                </button>
                {browseUrl && (
                  <>
                    <button
                      onClick={() => scanSingleUrl(browseUrl)}
                      disabled={scanningUrl}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
                    >
                      {scanningUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      Scan Page
                    </button>
                    <button
                      onClick={() => scanSingleUrl(browseUrl, true)}
                      disabled={scanningUrl}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {scanningUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                      All Pages
                    </button>
                  </>
                )}
                {browseUrl && (
                  <a href={browseUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            )}

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
                    <>
                      <button onClick={() => downloadAsZip(filtered.filter(m => selected.has(m.url)))}
                        disabled={zipping}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 disabled:opacity-50">
                        {zipping ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <FileArchive className="w-2.5 h-2.5" />}
                        ZIP selected ({selected.size})
                      </button>
                      <button onClick={() => {
                        const items = filtered.filter(m => selected.has(m.url));
                        toast.info(`Downloading ${items.length} files...`);
                        items.forEach((item, i) => setTimeout(() => downloadOne(item), i * 300));
                      }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20">
                        <Download className="w-2.5 h-2.5" /> Download ({selected.size})
                      </button>
                    </>
                  )}
                  <button onClick={() => downloadAsZip(filtered)}
                    disabled={zipping}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium hover:text-foreground disabled:opacity-50">
                    <FileArchive className="w-2.5 h-2.5" /> ZIP all
                  </button>
                  <button onClick={exportUrlList}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium hover:text-foreground">
                    Export URLs
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mini Browser Preview */}
          {browseMode && browseUrl && (
            <div className="border-b border-border bg-muted/20">
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-border">
                <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">{browseUrl}</span>
                <button onClick={() => { setBrowseUrl(""); setBrowseMode(false); }} className="p-0.5 rounded hover:bg-muted">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="h-[250px] relative">
                <iframe
                  src={browseUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  referrerPolicy="no-referrer"
                  title="Page Preview"
                  onError={() => {}}
                />
                {/* Overlay hint for blocked iframes */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-3 text-center max-w-xs opacity-0 hover:opacity-0 pointer-events-none" id="iframe-hint">
                    <p className="text-[10px] text-muted-foreground">If the page doesn't load, the site blocks embedding.</p>
                    <p className="text-[10px] text-muted-foreground">Click "Scan This Page" — it works regardless!</p>
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <a
                    href={browseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium shadow-lg hover:text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in tab
                  </a>
                  <button
                    onClick={() => scanSingleUrl(browseUrl)}
                    disabled={scanningUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium shadow-lg hover:bg-accent/80 disabled:opacity-50"
                  >
                    {scanningUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Scan Page
                  </button>
                  <button
                    onClick={() => scanSingleUrl(browseUrl, true)}
                    disabled={scanningUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {scanningUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    All Pages
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Media grid */}
          <div className="flex-1 overflow-auto p-3">
            {!scanned ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Camera className="w-8 h-8 opacity-30" />
                <p className="text-xs">Use "Scan Pages" or "Browse & Scan" to find media</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Image className="w-8 h-8 opacity-30" />
                <p className="text-xs">No {filter === "all" ? "media" : filter} found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {visibleItems.map((item) => (
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
                            src={item.thumbnailUrl || item.url}
                            alt={item.alt || ""}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // If thumbnail fails, try original
                              const img = e.target as HTMLImageElement;
                              if (item.thumbnailUrl && img.src !== item.url) {
                                img.src = item.url;
                              } else {
                                img.style.display = "none";
                                img.parentElement!.innerHTML =
                                  '<div class="flex items-center justify-center h-full text-muted-foreground"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                              }
                            }}
                          />
                        ) : item.type === "video" ? (
                          item.thumbnailUrl || item.poster ? (
                            <img src={item.thumbnailUrl || item.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
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

                      {/* Type & quality badge */}
                      <div className="absolute top-1 left-1 flex gap-0.5">
                        <TypeIcon type={item.type} />
                        {(item.sourceTag === 'gallery-original' || item.sourceTag === 'gallery-video') && (
                          <span className="text-[7px] bg-primary/80 text-primary-foreground px-1 rounded font-bold">HD</span>
                        )}
                      </div>

                      {/* Selection indicator */}
                      <div className="absolute top-1 right-1">
                        {selected.has(item.url) ? (
                          <CheckSquare className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>

                      {/* Preview button */}
                      <button
                        onClick={(e) => openPreview(item, e)}
                        className="absolute bottom-1 left-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                        title="Preview"
                      >
                        {item.type === "video" ? (
                          <Play className="w-3 h-3 text-foreground" />
                        ) : (
                          <ZoomIn className="w-3 h-3 text-foreground" />
                        )}
                      </button>

                      {/* Download button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadOne(item); }}
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
                {hasMore && (
                  <div className="flex justify-center pt-4 pb-2">
                    <button
                      onClick={() => setVisibleCount(c => c + LOAD_BATCH)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-muted text-muted-foreground text-xs font-medium hover:text-foreground hover:bg-muted/80 transition-colors"
                    >
                      Load more ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-background border-border">
          <DialogTitle className="sr-only">Media Preview</DialogTitle>
          {preview && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <TypeIcon type={preview.type} />
                  <span className="text-xs text-muted-foreground truncate font-mono">
                    {(preview.streamUrl || preview.url).split("/").pop()?.split("?")[0] || "file"}
                  </span>
                  {preview.streamUrl && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">HLS</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {preview.type === 'video' && (
                    <button
                      onClick={() => window.open(preview.downloadUrl || preview.streamUrl || preview.url, '_blank')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-muted-foreground text-xs hover:text-foreground"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </button>
                  )}
                  <button
                    onClick={() => preview && downloadOne(preview)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-muted/30">
                {preview.type === "image" ? (
                  <img
                    src={preview.url}
                    alt={preview.alt || ""}
                    className="max-w-full max-h-[70vh] object-contain rounded"
                  />
                ) : preview.type === "video" ? (
                  <HlsVideo
                    src={preview.streamUrl || preview.url}
                    poster={preview.poster}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Music className="w-12 h-12 text-muted-foreground" />
                    <audio src={preview.url} controls autoPlay className="w-full max-w-md" />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground truncate">
                  Source: {preview.foundOn} · Tag: &lt;{preview.sourceTag}&gt;
                  {preview.streamUrl && ` · Stream: ${preview.streamUrl.split("?")[0]}`}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
