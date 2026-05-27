import { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Play,
  Pencil,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SqlBlock } from "@/features/workspace/SqlBlock";
import { SqlPreviewModal } from "@/features/sql-preview/SqlPreviewModal";
import { ResultsPanel } from "@/features/results/ResultsPanel";
import { useAppStore, type QueryResultData } from "@/state/app-store";
import { cn } from "@/lib/utils";

// ── Mock data generator ──

function generateMockResults(sql: string): QueryResultData {
  // Simple mock that returns varied data based on keywords in the SQL
  const sqlLower = sql.toLowerCase();
  const isAggregate =
    sqlLower.includes("count(") ||
    sqlLower.includes("sum(") ||
    sqlLower.includes("avg(") ||
    sqlLower.includes("group by");
  const hasTags = sqlLower.includes("tag");
  const hasDates = sqlLower.includes("date") || sqlLower.includes("created_at");

  if (isAggregate && hasTags) {
    return {
      columns: ["tag", "count"],
      rows: [
        ["local-first", 42],
        ["offline", 35],
        ["database", 28],
        ["ai", 31],
        ["react", 19],
        ["rust", 24],
        ["design", 15],
        ["productivity", 22],
        ["open-source", 18],
        ["tutorial", 12],
      ],
      rowCount: 10,
      truncated: false,
      elapsedMs: 23,
      mode: "sql",
    };
  }

  if (isAggregate) {
    return {
      columns: ["status", "count"],
      rows: [
        ["active", 156],
        ["archived", 43],
        ["draft", 78],
        ["published", 201],
      ],
      rowCount: 4,
      truncated: false,
      elapsedMs: 12,
      mode: "sql",
    };
  }

  if (hasDates) {
    const months = [
      "2024-01",
      "2024-02",
      "2024-03",
      "2024-04",
      "2024-05",
      "2024-06",
      "2024-07",
      "2024-08",
      "2024-09",
    ];
    return {
      columns: ["month", "ideas_created", "notes_written"],
      rows: months.map((m, i) => [
        m,
        10 + Math.floor(Math.abs(Math.sin(i * 1.5)) * 30),
        25 + Math.floor(Math.abs(Math.cos(i * 0.8)) * 40),
      ]),
      rowCount: months.length,
      truncated: false,
      elapsedMs: 18,
      mode: "sql",
    };
  }

  // Default: return a rich sample dataset
  return {
    columns: ["title", "summary", "tags", "created_at", "status"],
    rows: [
      [
        "Local-First Sync Engine",
        "A CRDT-based sync engine for offline-first applications with automatic conflict resolution.",
        "local-first, offline, rust",
        "2024-03-15",
        "active",
      ],
      [
        "Neon Auth Integration",
        "Passwordless auth using Neon's built-in auth hooks and Row-Level Security policies.",
        "auth, neon, security",
        "2024-03-10",
        "published",
      ],
      [
        "ChromaDB Query Optimizer",
        "Optimise vector search queries with automatic index selection and batch retrieval.",
        "chromadb, ai, performance",
        "2024-02-28",
        "active",
      ],
      [
        "Markdown to DS.Store parser",
        "Parse Apple .DS_Store files into structured markdown summaries for forensic analysis.",
        "forensic, macos, tooling",
        "2024-02-20",
        "archived",
      ],
      [
        "Alchemist — Query Interface",
        "Natural language to SQL/vector query interface with multi-source support.",
        "alchemist, sql, ai, react",
        "2024-02-15",
        "active",
      ],
      [
        "MemeLearn Spaced Repetition",
        "Anki-style scheduling algorithm for flashcard-based vocabulary retention.",
        "memelearn, education, rust",
        "2024-02-10",
        "published",
      ],
      [
        "ImageGenny Palette Extractor",
        "Extract dominant colour palettes from reference images using k-means clustering.",
        "imagegenny, design, ai",
        "2024-02-05",
        "draft",
      ],
      [
        "Tauri v2 Migration Guide",
        "Step-by-step guide for migrating Tauri v1 apps to v2 with the new plugin system.",
        "tauri, rust, tutorial",
        "2024-01-28",
        "published",
      ],
    ],
    rowCount: 8,
    truncated: false,
    elapsedMs: 15,
    mode: "sql",
  };
}

// ── Export helpers ──

function exportResults(
  results: QueryResultData,
  format: "csv" | "markdown" | "json"
) {
  if (format === "json") {
    const json = results.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      results.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
    downloadFile(
      JSON.stringify(json, null, 2),
      "results.json",
      "application/json"
    );
    return;
  }

  if (format === "csv") {
    const header = results.columns.join(",");
    const rows = results.rows.map((row) =>
      row
        .map((v) => {
          const s = String(v ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    );
    downloadFile([header, ...rows].join("\n"), "results.csv", "text/csv");
    return;
  }

  if (format === "markdown") {
    const header = `| ${results.columns.join(" | ")} |`;
    const separator = `| ${results.columns.map(() => "---").join(" | ")} |`;
    const rows = results.rows.map(
      (row) =>
        `| ${row
          .map((v) => String(v ?? "").replace(/\|/g, "\\|"))
          .join(" | ")} |`
    );
    downloadFile(
      [header, separator, ...rows].join("\n"),
      "results.md",
      "text/markdown"
    );
  }
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──

export function ChatPanel() {
  const chatHistory = useAppStore((s) => s.chatHistory);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const currentResults = useAppStore((s) => s.currentResults);
  const setCurrentResults = useAppStore((s) => s.setCurrentResults);
  const activeSource = useAppStore((s) => s.activeSource);

  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasRunQuery, setHasRunQuery] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isGenerating, currentResults]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput("");
    setHasRunQuery(false);
    setCurrentResults(null);

    // Add user message
    addChatMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    // Simulate AI generation
    setIsGenerating(true);
    setGeneratedSql(null);

    // TODO: connect to real generate_query Tauri command
    await new Promise((r) => setTimeout(r, 1500));

    const sampleSql = `SELECT title, summary, tags, created_at, status
FROM ideas
WHERE summary LIKE '%local-first%'
   OR tags LIKE '%local%'
   OR summary LIKE '%offline%'
ORDER BY created_at DESC
LIMIT 100;`;

    setGeneratedSql(sampleSql);
    setIsGenerating(false);
  };

  const handleRunQuery = async () => {
    if (!generatedSql) return;
    setIsRunning(true);
    setShowPreview(false);

    await new Promise((r) => setTimeout(r, 800));

    const results = generateMockResults(generatedSql);
    setCurrentResults(results);
    setHasRunQuery(true);
    setIsRunning(false);
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1 text-right">
                {msg.timestamp}
              </p>
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
                <span className="text-xs font-medium text-violet-400">
                  Alchemist
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  "Reading schema...",
                  "Finding relevant tables...",
                  "Generating read-only SQL...",
                ].map((step, i) => (
                  <div key={step} className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        i === 0
                          ? "bg-violet-400 animate-pulse"
                          : "bg-violet-600/30"
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
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generated SQL */}
        {generatedSql && !isGenerating && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Here is the SQL I generated for you:
            </p>
            <SqlBlock sql={generatedSql} />

            {/* Action buttons */}
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => setShowPreview(true)}
                disabled={isRunning}
                className="h-9 px-4 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
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

        {/* Running state */}
        {isRunning && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-5 py-3 bg-[#0d0d1a] border border-violet-500/15">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs text-zinc-400">
                  Executing query on{" "}
                  <span className="text-zinc-300 font-medium">
                    {activeSource?.fileName ?? "database"}
                  </span>
                  ...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {hasRunQuery && currentResults && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500">
                Query completed in{" "}
                <span className="font-mono text-zinc-400">
                  {currentResults.elapsedMs}ms
                </span>
              </span>
            </div>
            <ResultsPanel onExport={(fmt) => exportResults(currentResults, fmt)} />
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
              disabled={isGenerating || isRunning}
              className="h-10 pl-4 pr-10 text-sm bg-white/[0.04] border-white/[0.08] text-zinc-200 placeholder:text-zinc-600 rounded-xl"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating || isRunning}
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
            handleRunQuery();
          }}
          onEdit={() => {
            setShowPreview(false);
          }}
        />
      )}
    </div>
  );
}
