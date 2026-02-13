import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Sparkles, Copy, Check, GripHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { demoFindings, demoEndpoints, demoSecrets, demoAssets, demoPages, demoSearchResults, demoNetworkRequests, demoTechStack } from "@/lib/demo-data";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const STARTER_SUGGESTIONS = [
  "What security issues were found?",
  "Which files reference /api/orders?",
  "Are there any exposed secrets?",
  "Summarize the scan results",
  "What tech stack is this site using?",
];

// Build scan context to send to GPT-5
function buildScanContext() {
  return {
    pages: demoPages.map(p => ({ url: p.url, status: p.statusCode, title: p.title, responseTime: p.responseTime })),
    findings: demoFindings.map(f => ({ severity: f.severity, title: f.title, message: f.message, location: f.location, category: f.category })),
    endpoints: demoEndpoints.map(e => ({ url: e.url, method: e.method, type: e.type, foundIn: e.foundIn, line: e.line, operationName: e.operationName })),
    secrets: demoSecrets.map(s => ({ type: s.type, maskedValue: s.maskedValue, severity: s.severity, location: s.location, line: s.line })),
    assets: demoAssets.map(a => ({ url: a.url, type: a.type, size: a.size })),
    techStack: demoTechStack,
    codeSearchResults: demoSearchResults.map(r => ({ file: r.file, line: r.line, match: r.match, context: r.context })),
    networkRequests: demoNetworkRequests.map(r => ({ method: r.method, url: r.url, statusCode: r.statusCode, type: r.type, size: r.size })),
  };
}

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, scanContext: buildScanContext() }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    const errorMsg = body.error || `Error ${resp.status}`;
    onError(errorMsg);
    return;
  }

  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<"gpt-5" | "gpt-5.2">("gpt-5");
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [size, setSize] = useState<Size>({ width: 420, height: 560 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-resize]')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !open) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e: MouseEvent) => {
      const newWidth = Math.max(350, e.clientX - position.x);
      const newHeight = Math.max(400, e.clientY - position.y);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleResizeEnd = () => setIsResizing(false);

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, position]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setInput("");
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsertAssistant,
        onDone: () => setLoading(false),
        onError: (err) => {
          toast.error(err);
          setLoading(false);
        },
      });
    } catch (e) {
      toast.error("Failed to connect to AI");
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all backdrop-blur-sm border border-primary/20"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">{model === "gpt-5.2" ? "GPT-5.2" : "GPT-5"} Assistant</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 50,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-2xl border border-white/20 bg-gradient-to-br from-card/80 via-card/70 to-card/60 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-primary/10 to-primary/5 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center border border-primary/30">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{model === "gpt-5.2" ? "GPT-5.2" : "GPT-5"} Assistant</span>
            <span className="text-xs text-muted-foreground ml-2">Powered by OpenAI</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as "gpt-5" | "gpt-5.2")}
            className="text-xs px-2 py-1 rounded-md bg-muted/50 border border-white/10 text-foreground hover:bg-muted transition-colors"
          >
            <option value="gpt-5">GPT-5</option>
            <option value="gpt-5.2">GPT-5.2</option>
          </select>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mx-auto mb-3 border border-primary/20">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Scan Analysis Assistant</p>
              <p className="text-xs text-muted-foreground mt-1">Ask anything about the scan results. Answers are based exclusively on indexed data.</p>
            </div>
            <div className="space-y-1.5">
              {STARTER_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-white/10 hover:border-primary/30 hover:bg-primary/5 text-xs text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
              m.role === "user"
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-br-sm"
                : "bg-muted/50 text-foreground rounded-bl-sm border border-white/10"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-xs prose-invert max-w-none
                  [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-primary
                  [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-2.5 [&_h2]:mb-1.5 [&_h2]:text-primary/90
                  [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-primary/80
                  [&_p]:my-2 [&_p]:leading-relaxed
                  [&_ul]:my-2 [&_ul]:ml-4 [&_ul]:list-disc
                  [&_ol]:my-2 [&_ol]:ml-4 [&_ol]:list-decimal
                  [&_li]:my-1 [&_li]:ml-2
                  [&_code]:text-primary [&_code]:bg-primary/15 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                  [&_pre]:my-2 [&_pre]:bg-black/40 [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto
                  [&_pre_code]:text-primary/90 [&_pre_code]:font-mono
                  [&_strong]:font-semibold [&_strong]:text-foreground
                  [&_em]:italic
                  [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:my-2
                  [&_table]:text-xs [&_table]:my-2
                  [&_th]:text-left [&_th]:font-semibold
                  [&_td]:py-1 [&_td]:px-2">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span>{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground rounded-bl-sm border border-white/10">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-gradient-to-r from-card/50 to-card/40">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Ask about scan results..."
            className="h-9 text-xs bg-card/50 border-white/10 focus-visible:ring-primary/50"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        data-resize="true"
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group"
      >
        <div className="absolute bottom-1 right-1 w-4 h-4 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
          <GripHorizontal className="w-3 h-3 text-muted-foreground rotate-45" />
        </div>
      </div>
    </motion.div>
  );
}
