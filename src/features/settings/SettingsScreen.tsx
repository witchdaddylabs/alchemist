import { useState } from "react";
import {
  Server,
  Shield,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  Brain,
  Cloud,
  Lock,
  ChevronRight,
  AlertTriangle,
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

type ProviderStatus = "unknown" | "connected" | "disconnected" | "error";

interface ProviderState {
  name: string;
  type: "local" | "cloud";
  icon: React.ReactNode;
  status: ProviderStatus;
  model: string;
  url?: string;
  hasKey?: boolean;
  lastChecked: string | null;
}

const initialProviders: ProviderState[] = [
  {
    name: "Ollama",
    type: "local",
    icon: <Brain className="w-5 h-5" />,
    status: "connected",
    model: "llama3.2",
    url: "http://localhost:11434",
    lastChecked: "Just now",
  },
  {
    name: "OpenAI",
    type: "cloud",
    icon: <Cloud className="w-5 h-5" />,
    status: "disconnected",
    model: "gpt-4o-mini",
    hasKey: false,
    lastChecked: null,
  },
];

export function SettingsScreen() {
  const settings = useAppStore((s) => s.settings);
  const [providers, setProviders] = useState<ProviderState[]>(initialProviders);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedKey, setSavedKey] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showCloudModal, setShowCloudModal] = useState(false);

  const handleTestConnection = async (name: string) => {
    setTestingProvider(name);
    // Simulate connection test
    await new Promise((r) => setTimeout(r, 1200));
    setProviders((prev) =>
      prev.map((p) =>
        p.name === name
          ? {
              ...p,
              status: "connected" as ProviderStatus,
              lastChecked: "Just now",
            }
          : p
      )
    );
    setTestingProvider(null);
  };

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) return;
    setSavedKey(true);
    setProviders((prev) =>
      prev.map((p) =>
        p.name === "OpenAI" ? { ...p, hasKey: true, status: "connected" } : p
      )
    );
    setTimeout(() => setSavedKey(false), 2000);
  };

  const handleRemoveKey = () => {
    setApiKeyInput("");
    setProviders((prev) =>
      prev.map((p) =>
        p.name === "OpenAI" ? { ...p, hasKey: false, status: "disconnected" } : p
      )
    );
  };

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
            {providers.map((provider) => (
              <div
                key={provider.name}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        provider.type === "local"
                          ? "bg-violet-600/15 text-violet-400"
                          : "bg-cyan-600/15 text-cyan-400"
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
                            provider.type === "local"
                              ? "text-violet-400 border-violet-500/20"
                              : "text-cyan-400 border-cyan-500/20"
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(provider.name)}
                    disabled={testingProvider === provider.name}
                    className="h-8 px-3 rounded-lg text-xs font-medium border-white/[0.1] text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.06]"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3 h-3 mr-1.5",
                        testingProvider === provider.name && "animate-spin"
                      )}
                    />
                    Test
                  </Button>
                </div>

                {/* Model info */}
                <div className="px-4 pb-3 flex items-center gap-4 text-[11px] text-zinc-600">
                  <span>
                    Model:{" "}
                    <span className="font-mono text-zinc-400">
                      {provider.model}
                    </span>
                  </span>
                  {provider.url && (
                    <span>
                      URL:{" "}
                      <span className="font-mono text-zinc-400">
                        {provider.url}
                      </span>
                    </span>
                  )}
                  {provider.lastChecked && (
                    <span>
                      Last checked:{" "}
                      <span className="text-zinc-500">
                        {provider.lastChecked}
                      </span>
                    </span>
                  )}
                </div>

                {/* Open AI API Key */}
                {provider.name === "OpenAI" && (
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
                    </div>
                    {provider.hasKey ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-zinc-500 bg-black/30 rounded-lg px-3 py-1.5 border border-white/[0.04]">
                          sk-••••••••••••••••{apiKeyInput.slice(-4) || "xxxx"}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveKey}
                          className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder="sk-..."
                            className="h-8 pr-8 text-xs font-mono bg-black/30 border-white/[0.08] text-zinc-200 placeholder:text-zinc-700 rounded-lg"
                          />
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                          >
                            {showApiKey ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <Button
                          onClick={handleSaveApiKey}
                          disabled={!apiKeyInput.trim()}
                          className="h-8 px-3 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                        >
                          Save
                        </Button>
                      </div>
                    )}
                    {savedKey && (
                      <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        API key saved securely
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
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
                    When using cloud providers (OpenAI), schema and query
                    context may be sent to their servers.
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
        {settings.cloudConsentAcknowledged && settings.cloudConsent && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Cloud provider enabled. Schema context may be sent to OpenAI
              servers. Review your privacy settings above.
            </p>
          </div>
        )}
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
