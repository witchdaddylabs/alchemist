import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SqlBlockProps {
  sql: string;
  className?: string;
}

// Simple SQL syntax highlighting — keywords, strings, numbers
const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN",
  "ORDER", "BY", "ASC", "DESC", "LIMIT", "OFFSET", "AS", "ON", "JOIN",
  "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "FULL", "GROUP", "HAVING",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "CASE", "WHEN", "THEN", "ELSE",
  "END", "IS", "NULL", "DISTINCT", "ALL", "UNION", "EXCEPT", "INTERSECT",
  "EXISTS", "CAST", "COALESCE", "NULLIF", "TRUE", "FALSE",
]);

function tokenizeSql(sql: string): Array<{ text: string; type: "keyword" | "string" | "number" | "comment" | "plain" | "operator" }> {
  const tokens: Array<{ text: string; type: "keyword" | "string" | "number" | "comment" | "plain" | "operator" }> = [];
  // Split by word boundaries, strings, and comments
  const re = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|--.*$|\/\*[\s\S]*?\*\/|\b\d+(?:\.\d+)?\b|\b\w+\b|[^\w\s]+|\s+)/gm;
  let match;
  while ((match = re.exec(sql)) !== null) {
    const text = match[0];
    if (text.startsWith("'") || text.startsWith('"')) {
      tokens.push({ text, type: "string" });
    } else if (text.startsWith("--") || text.startsWith("/*")) {
      tokens.push({ text, type: "comment" });
    } else if (/^\d+(\.\d+)?$/.test(text)) {
      tokens.push({ text, type: "number" });
    } else if (/^\s+$/.test(text)) {
      tokens.push({ text, type: "plain" });
    } else if (SQL_KEYWORDS.has(text.toUpperCase())) {
      tokens.push({ text, type: "keyword" });
    } else if (/^[^\w\s]+$/.test(text)) {
      tokens.push({ text, type: "operator" });
    } else {
      tokens.push({ text, type: "plain" });
    }
  }
  return tokens;
}

export function SqlBlock({ sql, className }: SqlBlockProps) {
  const tokens = useMemo(() => tokenizeSql(sql), [sql]);

  return (
    <div
      className={cn(
        "relative rounded-xl bg-[#0a0a0f] border border-white/[0.08] overflow-hidden font-['JetBrains_Mono'] text-sm leading-relaxed",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">SQL</span>
      </div>

      {/* Code */}
      <pre className="p-4 overflow-x-auto text-[13px] leading-[1.6]">
        <code>
          {tokens.map((token, i) => {
            switch (token.type) {
              case "keyword":
                return <span key={i} className="text-violet-400">{token.text}</span>;
              case "string":
                return <span key={i} className="text-amber-300/90">{token.text}</span>;
              case "number":
                return <span key={i} className="text-emerald-400">{token.text}</span>;
              case "comment":
                return <span key={i} className="text-zinc-600 italic">{token.text}</span>;
              case "operator":
                return <span key={i} className="text-zinc-400">{token.text}</span>;
              default:
                return <span key={i} className="text-zinc-200">{token.text}</span>;
            }
          })}
        </code>
      </pre>
    </div>
  );
}
