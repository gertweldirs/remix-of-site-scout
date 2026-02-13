import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_SUGGESTIONS = [
  "Where is component DashboardView defined?",
  "Which files reference /api/orders?",
  "Show all images on the homepage",
  "What endpoints were found?",
  "Are there any exposed secrets?",
];

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    // Demo response based on indexed data
    setTimeout(() => {
      const response = generateDemoResponse(userMsg);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setLoading(false);
    }, 800);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-medium">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] rounded-lg border border-border bg-card shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Ask questions about the scan results. Answers are based only on indexed data.</p>
            <div className="space-y-1.5">
              {STARTER_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="w-full text-left px-3 py-2 rounded-md bg-muted/50 hover:bg-muted text-xs text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground">
              <span className="animate-pulse">Analyzing indexed data...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Ask about scan results..."
            className="h-8 text-xs"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function generateDemoResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("dashboardview") || q.includes("component")) {
    return `Found "DashboardView" in the indexed sources:\n\n📄 static/app.js:201\n\`{ path: "/dashboard", component: DashboardView, auth: true }\`\n\nThis appears to be a route definition. The component itself is likely defined via dynamic import in the bundle.\n\n→ Open in Sources: static/app.js:201`;
  }
  if (q.includes("/api/orders") || q.includes("endpoint")) {
    return `Found 8 endpoints in the scan:\n\n• GET /api/v2/users → static/app.js:42\n• GET /api/v2/products → static/app.js:87\n• POST /api/v2/orders → static/app.js:112\n• POST /graphql (GetProducts) → main.bundle.js:234\n• POST /graphql (GetUser) → main.bundle.js:267\n• WS wss://ws.example-corp.com/realtime → vendor.js:1\n• POST /api/v2/auth/login → static/app.js:23\n• POST /api/v2/auth/refresh → static/app.js:35`;
  }
  if (q.includes("image") || q.includes("afbeelding")) {
    return `Found 3 images on the homepage:\n\n🖼 hero.webp (445 KB) — https://example-corp.com/images/hero.webp\n🖼 og-image.png (228 KB) — https://example-corp.com/images/og-image.png\n🖼 logo.svg (4.1 KB) — https://example-corp.com/images/logo.svg\n\nAll downloadable via Assets tab.`;
  }
  if (q.includes("secret") || q.includes("key") || q.includes("token")) {
    return `⚠️ 3 potential secrets detected:\n\n🔴 HIGH: Stripe API Key (95% confidence)\n   static/app.js:142 — sk_live_****...****7f2a\n\n🟡 MEDIUM: JWT Token (80% confidence)\n   static/app.js:89 — eyJhb****...****kQ2c\n\n🔴 HIGH: AWS Access Key (90% confidence)\n   static/vendor.js:2341 — AKIA****...****3QXR\n\nAll values are masked. See Secrets tab for details.`;
  }
  return `Based on the indexed scan data for example-corp.com (147 pages, 10 assets):\n\nI found references related to your query across the indexed HTML, JS, and CSS sources. Try being more specific, e.g.:\n• "Which files call /api/v2/users?"\n• "Show tech stack detected"\n• "List all broken links"`;
}
