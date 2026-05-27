import { Database, Cpu, Check } from "lucide-react";
import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";

const safetyChecks = [
  { label: "Read-Only Connected", passed: true },
  { label: "Single Statement", passed: true },
  { label: "SELECT Only", passed: true },
  { label: "Limit Applied", passed: true },
];

export function InspectorPanel() {
  const activeSource = useAppStore((s) => s.activeSource);
  const dataSourceType = useAppStore((s) => s.dataSourceType);

  if (!activeSource) {
    return (
      <div className="w-64 lg:w-72 h-full flex flex-col bg-[#0d0d14] border-l border-white/[0.06]">
        <Section title="DATABASE">
          <p className="text-xs text-zinc-600">No database open.</p>
        </Section>
        <Section title="MODEL">
          <p className="text-xs text-zinc-600">No provider selected.</p>
        </Section>
      </div>
    );
  }

  const openedDate = activeSource.openedAt
    ? new Date(activeSource.openedAt).toLocaleString()
    : "—";

  return (
    <div className="w-64 lg:w-72 h-full flex flex-col bg-[#0d0d14] border-l border-white/[0.06]">
      {/* Database section */}
      <Section title="DATA SOURCE">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">
              {activeSource.fileName}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider">
              {dataSourceType === "sqlite"
                ? "SQLite Database"
                : dataSourceType === "chromadb"
                ? "ChromaDB Palace"
                : dataSourceType === "mempalace"
                ? "MemPalace YAML"
                : "Unknown"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <DetailRow label="Path" value={activeSource.path} mono />
          <DetailRow label="Info" value={activeSource.summary || "—"} />
          <DetailRow label="Opened" value={openedDate} />
        </div>
      </Section>

      {/* Model section */}
      <Section title="MODEL">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-xs text-zinc-500">Provider</span>
          </div>
          <p className="text-sm text-zinc-200 ml-5.5">Ollama (Local)</p>

          <div className="flex items-center gap-2 mt-2">
            <Cpu className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-xs text-zinc-500">Model</span>
          </div>
          <p className="text-sm text-zinc-200 ml-5.5">llama3.2:latest</p>

          <div className="flex items-center gap-2 mt-2">
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-xs text-zinc-500">Status</span>
            <span className="text-xs text-emerald-400 font-medium">Running</span>
          </div>
        </div>
      </Section>

      {/* Safety section */}
      <Section title="SAFETY">
        <div className="space-y-2">
          {safetyChecks.map((check) => (
            <div key={check.label} className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                  check.passed ? "bg-emerald-500/15" : "bg-zinc-800"
                )}
              >
                <Check
                  className={cn(
                    "w-2.5 h-2.5",
                    check.passed ? "text-emerald-400" : "text-zinc-700"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs",
                  check.passed ? "text-zinc-300" : "text-zinc-600"
                )}
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
          All queries are read-only. Your data never leaves your machine.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4 border-b border-white/[0.06] last:border-b-0">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-zinc-600 w-16 shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs text-zinc-400 truncate",
          mono && "font-['JetBrains_Mono'] text-[11px]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
