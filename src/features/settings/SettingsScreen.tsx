import { useState, useEffect } from "react";
import {
  Server,
  Shield,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  Brain,
  Cloud,
  Globe,
  BrainCircuit,
  Lock,
  ChevronRight,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, type PrivacyMode } from "@/state/app-store";
import { cn } from "@/lib/utils";
import { CloudConsentModal } from "@/features/settings/CloudConsentModal";
import { checkProvider, listModels, storeApiKey, deleteApiKey, checkApiKey } from "@/lib/tauri";

type ProviderStatus = "unknown" | "connected" | "disconnected" | "error";

interface ProviderState {
  id: string;
  name: string;
  type: "local" | "cloud";
  icon: React.ReactNode;
  status: ProviderStatus;
  model: string;
  url: string;
  hasKey?: boolean;
  lastChecked: string | null;
}

const initialProviders: ProviderState[] = [
  {
    id: "ollama",
    name: "Ollama",
    type: "local",
    icon: <Brain className="w-5 h-5" />,
    status: "connected",
    model: "llama3.2",
    url: "http://localhost:11434",
    lastChecked: "Just now",
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "cloud",
    icon: <Cloud className="w-5 h-5" />,
    status: "disconnected",
    model: "gpt-4.1",
    url: "https://api.openai.com/v1",
    hasKey: false,
    lastChecked: null,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "cloud",
    icon: <BrainCircuit className="w-5 h-5" />,
    status: "disconnected",
    model: "deepseek-v4-flash",
    url: "https://api.deepseek.com",
    hasKey: false,
    lastChecked: null,
  },
  {
    id: "google-ai",
    name: "Google AI Studio",
    type: "cloud",
    icon: <Globe className="w-5 h-5" />,
    status: "disconnected",
    model: "gemini-2.5-flash",
    url: "https://generativelanguage.googleapis.com/v1beta",
    hasKey: false,
    lastChecked: null,
  },
];

type ApiKeysState = Record<string, { key: string; saved: boolean; show: boolean }>;

function emptyApiKeys(): ApiKeysState {
  const keys: ApiKeysState = {};
  for (const p of initialProviders) {
    if (p.type === "cloud") {
      keys[p.id] = { key: "", saved: false, show: false };
    }
  }
  return keys;
}

const providerColors: Record<string, string> = {
  ollama: "violet",
  openai: "cyan",
  deepseek: "blue",
  "google-ai": "emerald",
};

const badgeColors: Record<string, string> = {
  violet: "text-violet-400 border-violet-500/20",
  cyan: "text-cyan-400 border-cyan-500/20",
  blue: "text-blue-400 border-blue-500/20",
  emerald: "text-emerald-400 border-emerald-500/20",
};

const iconBgColors: Record<string, string> = {
  violet: "bg-violet-600/15 text-violet-400",
  cyan: "bg-cyan-600/15 text-cyan-400",
  blue: "bg-blue-600/15 text-blue-400",
  emerald: "bg-emerald-600/15 text-emerald-400",
};

export function SettingsScreen() {
  const settings = useAppStore((s) => s.settings);
  const [providers, setProviders] = useState<ProviderState[]>(initialProviders);
  const [apiKeys, setApiKeys] = useState<ApiKeysState>(emptyApiKeys);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [fetchingModels, setFetchingModels] = useState<string | null>(null);

  // Inline model editing
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editModelValue, setEditModelValue] = useState("");

  // ── Mount: check existing keys + Ollama health ──

  useEffect(() => {
    const init = async () => {
      // Check Ollama (no key needed)
      try {
        const health = await checkProvider("ollama", "http://localhost:11434", "llama3.2");
        setProviders((prev) =>
          prev.map((p) =>
            p.id === "ollama"
              ? {
                  ...p,
                  status: health.reachable ? "connected" : "disconnected",
                  lastChecked: health.reachable ? "Just now" : null,
                }
              : p
          )
        );
      } catch {
        // Ollama not running — leave as unknown
      }

      // Check cloud provider keys
      for (const p of initialProviders) {
        if (p.type !== "cloud") continue;
        const keyAccount = `${p.id}_api_key`;
        try {
          const exists = await checkApiKey(keyAccount);
          setApiKeys((prev) => ({
            ...prev,
            [p.id]: { ...prev[p.id], saved: exists, show: false, key: exists ? "••••••••" : "" },
          }));
          setProviders((prev) =>
            prev.map((pr) => (pr.id === p.id ? { ...pr, hasKey: exists } : pr))
          );
        } catch {
          // Key check failed — leave as default
        }
      }
    };
    init();
  }, []);

  // ── Connection test ──

  const handleTestConnection = async (id: string) => {
    setTestingProvider(id);
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "unknown" as ProviderStatus } : p
      )
    );

    try {
      const provider = providers.find((p) => p.id === id);
      if (!provider) return;

      const key = apiKeys[id]?.key || undefined;
      const health = await checkProvider(id, provider.url, provider.model, key);

      setProviders((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: health.reachable ? ("connected" as ProviderStatus) : ("error" as ProviderStatus),
                lastChecked: "Just now",
              }
            : p
        )
      );
    } catch (err) {
      setProviders((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "error" as ProviderStatus, lastChecked: "Just now" }
            : p
        )
      );
    }

    setTestingProvider(null);
  };

  // ── API key management ──

  const handleSaveApiKey = async (id: string) => {
    const key = apiKeys[id]?.key;
    if (!key?.trim()) return;
    if (key === "••••••••") return; // Already saved, no change

    const keyAccount = `${id}_api_key`;

    try {
      await storeApiKey(keyAccount, key.trim());
      setApiKeys((prev) => ({ ...prev, [id]: { ...prev[id], saved: true, key: "••••••••" } }));
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, hasKey: true } : p))
      );
    } catch (err) {
      console.error("Failed to save key:", err);
    }

    setTimeout(() => {
      setApiKeys((prev) => ({ ...prev, [id]: { ...prev[id], saved: false } }));
    }, 2000);
  };

  const handleRemoveKey = async (id: string) => {
    const keyAccount = `${id}_api_key`;

    try {
      await deleteApiKey(keyAccount);
      setApiKeys((prev) => ({ ...prev, [id]: { key: "", saved: false, show: false } }));
      setProviders((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, hasKey: false, status: "disconnected" as ProviderStatus } : p
        )
      );
    } catch (err) {
      console.error("Failed to remove key:", err);
    }
  };

  const toggleShowKey = (id: string) => {
    setApiKeys((prev) => ({ ...prev, [id]: { ...prev[id], show: !prev[id].show } }));
  };

  const setKeyInput = (id: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [id]: { ...prev[id], key: value } }));
  };

  // ── Model editing ──

  const startEditModel = (id: string, currentModel: string) => {
    setEditingModel(id);
    setEditModelValue(currentModel);
  };

  const saveEditModel = (id: string) => {
    if (editModelValue.trim()) {
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, model: editModelValue.trim() } : p))
      );
    }
    setEditingModel(null);
  };

  const cancelEditModel = () => {
    setEditingModel(null);
  };

  // ── Fetch available models from provider API ──

  const handleFetchModels = async (id: string) => {
    setFetchingModels(id);

    try {
      const provider = providers.find((p) => p.id === id);
      if (!provider) return;

      const key = apiKeys[id]?.key || undefined;
      const models = await listModels(id, provider.url, key);

      if (models.length > 0) {
        setProviders((prev) =>
          prev.map((p) => (p.id === id ? { ...p, model: models[0] } : p))
        );
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
    }

    setFetchingModels(null);
  };

  // ── Status helpers ──

  const statusDot = (status: ProviderStatus) => {
    const colors = {
      connected: "bg-emerald-500",
      disconnected: "bg-zinc-600",
      error: "bg-red-500",
      unknown: "bg-zinc-600",
    };
    return <span className={cn("w-2 h-2 rounded-full", colors[status])} />;
  };

  const statusLabel = (status: ProviderStatus) => {
    const labels = {
      connected: "Connected",
      disconnected: "Not configured",
      error: "Error",
      unknown: "Unknown",
    };
    return (
      <span
        className={cn("text-xs", {
          "text-emerald-400": status === "connected",
          "text-zinc-600": status === "disconnected",
          "text-red-400": status === "error",
        })}
      >
        {labels[status]}
      </span>
    );
  };

  const hasCloudKey = providers.some((p) => p.type === "cloud" && p.hasKey);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0b10] min-w-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure providers, privacy, and preferences
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* ── Providers section ── */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Server className="w-3.5 h-3.5" />
            AI Providers
          </h2>

          <div className="space-y-3">
            {providers.map((provider) => {
              const colorKey = providerColors[provider.id] || "zinc";
              const apiKey = apiKeys[provider.id];
              const isEditingModel = editingModel === provider.id;
              const isFetching = fetchingModels === provider.id;

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          iconBgColors[colorKey]
                        )}
                      >
                        {provider.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-zinc-200">
                          {provider.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 px-1.5 text-[10px] font-normal",
                              badgeColors[colorKey]
                            )}
                          >
                            {provider.type === "local" ? "Local" : "Cloud"}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            {statusDot(provider.status)}
                            {statusLabel(provider.status)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={testingProvider === provider.id}
                        className="h-8 px-3 rounded-lg text-xs font-medium border-white/[0.1] text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.06]"
                      >
                        <RefreshCw
                          className={cn(
                            "w-3 h-3 mr-1.5",
                            testingProvider === provider.id && "animate-spin"
                          )}
                        />
                        Test
                      </Button>
                    </div>
                  </div>

                  {/* Model + URL info */}
                  <div className="px-4 pb-3 flex items-center gap-4 text-[11px] text-zinc-600 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      Model:{" "}
                      {isEditingModel ? (
                        <span className="inline-flex items-center gap-1">
                          <Input
                            value={editModelValue}
                            onChange={(e) => setEditModelValue(e.target.value)}
                            className="h-7 w-40 text-xs font-mono bg-black/40 border-white/[0.08] text-zinc-200 rounded-md px-2"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditModel(provider.id);
                              if (e.key === "Escape") cancelEditModel();
                            }}
                            onBlur={() => saveEditModel(provider.id)}
                          />
                        </span>
                      ) : (
                        <>
                          <span className="font-mono text-zinc-400">
                            {provider.model}
                          </span>
                          <button
                            onClick={() => startEditModel(provider.id, provider.model)}
                            className="text-zinc-700 hover:text-zinc-400 transition-colors"
                            title="Edit model"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFetchModels(provider.id)}
                            disabled={isFetching}
                            className="text-zinc-700 hover:text-zinc-400 transition-colors disabled:opacity-50"
                            title="Auto-detect best model"
                          >
                            <RefreshCw
                              className={cn("w-3 h-3", isFetching && "animate-spin")}
                            />
                          </button>
                        </>
                      )}
                    </span>
                    <span>
                      URL:{" "}
                      <span className="font-mono text-zinc-400">
                        {provider.url}
                      </span>
                    </span>
                    {provider.lastChecked && (
                      <span>
                        Last checked:{" "}
                        <span className="text-zinc-500">
                          {provider.lastChecked}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* API Key section for cloud providers */}
                  {provider.type === "cloud" && apiKey && (
                    <div className="border-t border-white/[0.04] px-4 py-3 bg-white/[0.01]">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-3 h-3 text-zinc-600" />
                        <span className="text-xs text-zinc-500 font-medium">
                          API Key
                        </span>
                        {provider.hasKey && (
                          <Badge className="h-5 px-1.5 text-[10px] font-normal text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                            <Check className="w-2.5 h-2.5 mr-1" />
                            Saved
                          </Badge>
                        )}
                        <span className="text-[10px] text-zinc-700 ml-1">
                          {provider.id === "deepseek" && "(OpenAI-compatible)"}
                          {provider.id === "google-ai" && "(Gemini API)"}
                        </span>
                      </div>
                      {provider.hasKey ? (
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-zinc-500 bg-black/30 rounded-lg px-3 py-1.5 border border-white/[0.04]">
                            {apiKey.key.slice(-4)
                              ? "••••••••••••••••" + apiKey.key.slice(-4)
                              : "••••••••••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveKey(provider.id)}
                            className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <Input
                              type={apiKey.show ? "text" : "password"}
                              value={apiKey.key}
                              onChange={(e) => setKeyInput(provider.id, e.target.value)}
                              placeholder={
                                provider.id === "openai"
                                  ? "sk-..."
                                  : provider.id === "deepseek"
                                  ? "sk-..."
                                  : "Enter your API key"
                              }
                              className="h-8 pr-8 text-xs font-mono bg-black/30 border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 rounded-lg"
                            />
                            <button
                              onClick={() => toggleShowKey(provider.id)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                            >
                              {apiKey.show ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <Button
                            onClick={() => handleSaveApiKey(provider.id)}
                            disabled={!apiKey.key.trim()}
                            className="h-8 px-3 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                          >
                            Save
                          </Button>
                        </div>
                      )}
                      {apiKey.saved && (
                        <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          API key saved securely
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Privacy section ── */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Privacy & Data
          </h2>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
            {/* Cloud consent */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-600/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Cloud className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">
                    Cloud Provider Consent
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    When using cloud providers, schema and query context may be
                    sent to their servers.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCloudModal(true)}
                className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
              >
                {settings.cloudConsentAcknowledged ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                    Consented
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 mr-1" />
                    Review
                  </>
                )}
              </Button>
            </div>

            {/* Privacy mode */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-700/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">
                    Schema Sharing
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    How much schema context is sent with cloud queries.
                  </p>
                </div>
              </div>
              <Select
                value={settings.privacyMode}
                onValueChange={(v) => settings.setPrivacyMode(v as PrivacyMode)}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs bg-white/[0.04] border-white/[0.08] text-zinc-300 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d14] border-white/[0.08] text-zinc-300">
                  <SelectItem value="minimal" className="text-xs">
                    Minimal
                  </SelectItem>
                  <SelectItem value="standard" className="text-xs">
                    Standard
                  </SelectItem>
                  <SelectItem value="full" className="text-xs">
                    Full
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Privacy mode explanation */}
          <div className="mt-2 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              {settings.privacyMode === "minimal" &&
                "Only table and column names are sent. Column types and row samples are excluded."}
              {settings.privacyMode === "standard" &&
                "Table names, column names, and types are shared. No actual row data or samples."}
              {settings.privacyMode === "full" &&
                "All schema metadata including row samples and statistics are shared for better query generation."}
            </p>
          </div>
        </section>

        {/* ── Cloud warning banner ── */}
        {hasCloudKey && settings.cloudConsentAcknowledged && settings.cloudConsent && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Cloud providers enabled. Schema context may be sent to external
              servers. Review your privacy settings above.
            </p>
          </div>
        )}

        {/* ── Keyboard shortcuts section ── */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Keyboard Shortcuts
          </h2>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-zinc-400">⌘O</span>
              <span className="text-xs text-zinc-600">Open vaults screen</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-zinc-400">⌘↵</span>
              <span className="text-xs text-zinc-600">Run current query</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-zinc-400">⌘S</span>
              <span className="text-xs text-zinc-600">Save current query as spell</span>
            </div>
          </div>
        </section>
      </div>

      {/* Cloud consent modal */}
      {showCloudModal && (
        <CloudConsentModal
          onClose={() => setShowCloudModal(false)}
          onConsent={() => {
            settings.setCloudConsent(true);
            setShowCloudModal(false);
          }}
          onRevoke={() => {
            settings.setCloudConsent(false);
            setShowCloudModal(false);
          }}
          hasConsented={settings.cloudConsentAcknowledged && settings.cloudConsent}
        />
      )}
    </div>
  );
}
