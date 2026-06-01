import { useState, useEffect } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/state/app-store";
import { checkProvider, listModels } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface ProviderOption {
  id: string;
  label: string;
  type: string;
  url: string;
  model: string;
}

const DEFAULT_PROVIDERS: ProviderOption[] = [
  { id: "ollama", label: "Ollama (Local)", type: "ollama", url: "http://localhost:11434", model: "llama3.2" },
  { id: "openai", label: "OpenAI", type: "openai", url: "https://api.openai.com/v1", model: "gpt-4.1" },
  { id: "deepseek", label: "DeepSeek", type: "deepseek", url: "https://api.deepseek.com", model: "deepseek-v3-flash" },
  { id: "google-ai", label: "Google AI Studio", type: "google-ai", url: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash" },
];

export function ProviderSelector() {
  const activeProvider = useAppStore((s) => s.activeProvider);
  const setActiveProvider = useAppStore((s) => s.setActiveProvider);
  const savedProviders = useAppStore((s) => s.savedProviders);
  const setSavedProviders = useAppStore((s) => s.setSavedProviders);
  const [health, setHealth] = useState<Record<string, { status: "unknown" | "connected" | "error"; checking: boolean }>>({});

  // Build provider list: use saved config if available, otherwise fall back to defaults
  const providers = DEFAULT_PROVIDERS.map((opt) => {
    const saved = savedProviders[opt.id];
    if (saved) {
      return { ...opt, url: saved.url, model: saved.model };
    }
    return opt;
  });

  useEffect(() => {
    // Check health of all providers on mount, and fetch Ollama's real model list
    let cancelled = false;
    const checkAll = async () => {
      for (const opt of providers) {
        if (cancelled) return;
        setHealth((h) => ({ ...h, [opt.id]: { ...h[opt.id], checking: true } }));
        try {
          void savedProviders;
          const result = await checkProvider(opt.type, opt.url, opt.model);
          if (cancelled) return;
          setHealth((h) => ({
            ...h,
            [opt.id]: { status: result.reachable ? "connected" : "error", checking: false },
          }));
        } catch {
          if (cancelled) return;
          setHealth((h) => ({ ...h, [opt.id]: { status: "error", checking: false } }));
        }
      }

      // Fetch Ollama's real model list and update activeProvider / savedProviders
      const ollamaOpt = providers.find((o) => o.type === "ollama");
      if (ollamaOpt) {
        try {
          const models = await listModels("ollama", ollamaOpt.url);
          if (cancelled) return;
          if (models.length > 0) {
            const realModel = models[0];
            setSavedProviders({
              ...savedProviders,
              ollama: { type: "ollama", url: ollamaOpt.url, model: realModel },
            });
            // If currently on Ollama, update activeProvider to real model
            const current = useAppStore.getState().activeProvider;
            if (current.type === "ollama") {
              setActiveProvider({ type: "ollama", url: ollamaOpt.url, model: realModel });
            }
          }
        } catch {
          // Ollama not running — leave defaults
        }
      }
    };
    checkAll();
    return () => { cancelled = true; };
  }, []);


  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeProvider.type}
        onValueChange={(val) => {
          const opt = providers.find((o) => o.type === val);
          if (opt) {
            setActiveProvider({ type: opt.type, url: opt.url, model: opt.model });
          }
        }}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-[180px] text-xs bg-white/[0.04] border-white/[0.08] text-zinc-200 rounded-lg",
            "hover:bg-white/[0.06] transition-colors"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#1a1a24] border-white/[0.08] text-zinc-200">
          {providers.map((opt) => {
            const h = health[opt.id];
            return (
              <SelectItem key={opt.id} value={opt.type} className="text-xs focus:bg-white/[0.06] focus:text-zinc-100">
                <div className="flex items-center gap-2">
                  {h?.checking ? (
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                  ) : h?.status === "connected" ? (
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  ) : h?.status === "error" ? (
                    <WifiOff className="w-3 h-3 text-red-400" />
                  ) : (
                    <Wifi className="w-3 h-3 text-zinc-600" />
                  )}
                  <span>{opt.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <span className="text-[10px] text-zinc-600 truncate max-w-[100px]">
        {activeProvider.model}
      </span>
      {health[activeProvider.type]?.status === "error" && (
        <WifiOff className="w-3 h-3 text-red-400" />
      )}
      {health[activeProvider.type]?.status === "connected" && (
        <Wifi className="w-3 h-3 text-emerald-400" />
      )}
    </div>
  );
}
