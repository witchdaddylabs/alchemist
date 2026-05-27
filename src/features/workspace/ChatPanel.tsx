import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Play, Pencil, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SqlBlock } from "@/features/workspace/SqlBlock";
import { SqlPreviewModal } from "@/features/sql-preview/SqlPreviewModal";
import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const chatHistory = useAppStore((s) => s.chatHistory);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isGenerating]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput("");

    // Add user message
    addChatMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    // Simulate AI generation
    setIsGenerating(true);
    setGeneratedSql(null);

    // TODO: connect to real generate_query Tauri command
    await new Promise((r) => setTimeout(r, 1500));

    const sampleSql = `SELECT title, summary, tags, created_at
FROM ideas
WHERE summary LIKE '%local-first%'
   OR tags LIKE '%local%'
   OR summary LIKE '%offline%'
ORDER BY created_at DESC
LIMIT 100;`;

    setGeneratedSql(sampleSql);
    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0b10] min-w-0">
      {/* Scrollable chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {/* Chat messages */}
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5",
                msg.role === "user"
                  ? "bg-violet-600/20 text-violet-100 border border-violet-500/20"
                  : "bg-white/[0.04] text-zinc-200 border border-white/[0.06]"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] text-zinc-600 mt-1 text-right">{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {/* Generation status card */}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl px-5 py-4 bg-[#0d0d1a] border border-violet-500/15 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-violet-600/30 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                </div>
                <span className="text-xs font-medium text-violet-400">Alchemist</span>
              </div>
              <div className="space-y-1.5">
                {["Reading schema...", "Finding relevant tables...", "Generating read-only SQL..."].map(
                  (step, i) => (
                    <div key={step} className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          i === 0 ? "bg-violet-400 animate-pulse" : "bg-violet-600/30"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs",
                          i === 0 ? "text-zinc-300" : "text-zinc-600"
                        )}
                      >
                        {step}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generated SQL */}
        {generatedSql && !isGenerating && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">Here is the SQL I generated for you:</p>
            <SqlBlock sql={generatedSql} />

            {/* Action buttons */}
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => setShowPreview(true)}
                className="h-9 px-4 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run Query
              </Button>
              <Button
                variant="outline"
                className="h-9 px-4 rounded-lg text-xs font-medium border-white/[0.1] text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.06]"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit SQL
              </Button>
              <Button
                variant="outline"
                className="h-9 px-4 rounded-lg text-xs font-medium border-white/[0.1] text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.06]"
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                Save as Spell
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/[0.06] px-4 py-3 bg-[#0d0d14]">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Input
              placeholder="Ask your database anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              className="h-10 pl-4 pr-10 text-sm bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-600 rounded-xl"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* SQL Preview Modal */}
      {showPreview && generatedSql && (
        <SqlPreviewModal
          sql={generatedSql}
          onClose={() => setShowPreview(false)}
          onRun={() => {
            // TODO: invoke run_query Tauri command
            setShowPreview(false);
          }}
          onEdit={() => {
            setShowPreview(false);
          }}
        />
      )}
    </div>
  );
}
