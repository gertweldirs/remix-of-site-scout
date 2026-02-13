import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { demoFindings, demoEndpoints, demoSecrets, demoAssets, demoPages, demoSearchResults, demoNetworkRequests, demoTechStack } from "@/lib/demo-data";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const STARTER_SUGGESTIONS = [
  "What security issues were found?",
  "Which files reference /api/orders?",
  "Are there any exposed secrets?",
  "Summarize the scan results",
  "What tech stack is this site using?",
];

const MODELS = [
  { id: "openai/gpt-5", label: "GPT-5" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "google/gemini-2.5-pro", label: "Gemini Pro" },
];

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

export function AIChartSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="w-[420px] bg-background border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Assistant</p>
              <div className="relative mt-1">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {MODELS.find(m => m.id === selectedModel)?.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showModelDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
                    {MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelDropdown(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div ref={scrollRef}>
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Scan Analysis</p>
                  <p className="text-xs text-muted-foreground mt-1">Ask anything about the scan results</p>
                </div>
                <div className="space-y-2">
                  {STARTER_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 text-xs text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start mb-4">
                <div className="px-4 py-2.5 rounded-lg bg-muted text-xs text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask about results..."
              className="h-9 text-xs bg-card"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
