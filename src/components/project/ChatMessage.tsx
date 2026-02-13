import { Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] px-4 py-2.5 rounded-lg bg-muted text-foreground text-sm">
        <div className="prose prose-sm prose-invert max-w-none dark:prose-invert
          [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-primary
          [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2.5 [&_h2]:mb-1.5 [&_h2]:text-primary/90
          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-primary/80
          [&_p]:my-2 [&_p]:leading-relaxed
          [&_ul]:my-2 [&_ul]:ml-4 [&_ul]:list-disc
          [&_ol]:my-2 [&_ol]:ml-4 [&_ol]:list-decimal
          [&_li]:my-1 [&_li]:ml-2
          [&_code]:text-primary [&_code]:bg-primary/15 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
          [&_pre]:my-2 [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:relative
          [&_pre_code]:text-primary/90 [&_pre_code]:font-mono [&_pre_code]:block
          [&_strong]:font-semibold [&_strong]:text-foreground
          [&_em]:italic
          [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2
          [&_a]:text-primary [&_a]:hover:underline
        ">
          <ReactMarkdown
            components={{
              pre: ({ children }) => (
                <pre className="relative">
                  <button
                    onClick={() => {
                      const code = (children as any)?.props?.children || "";
                      copyCode(code);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded bg-primary/20 hover:bg-primary/30 transition-colors text-primary text-xs"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  {children}
                </pre>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
