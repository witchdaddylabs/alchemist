import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VaultScreen } from "@/features/vault/VaultScreen";
import { Workspace } from "@/features/workspace/Workspace";
import { SpellsScreen } from "@/features/spells/SpellsScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { useAppStore } from "@/state/app-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AlchemistIcon } from "@/components/icons/AlchemistIcon";

export function AppShell() {
  const activeView = useAppStore((s) => s.activeView);

  useKeyboardShortcuts();

  const shortcutHint = () => {
    const hints: string[] = [];
    if (activeView !== "vault") hints.push("⌘O Open Vault");
    if (activeView === "workspace") {
      hints.push("⌘↵ Run Query");
      hints.push("⌘S Save Spell");
    }
    return hints;
  };

  const renderView = () => {
    switch (activeView) {
      case "vault":
        return <ErrorBoundary name="Vaults"><VaultScreen /></ErrorBoundary>;
      case "workspace":
        return <ErrorBoundary name="Workspace"><Workspace /></ErrorBoundary>;
      case "spells":
        return <ErrorBoundary name="Spells"><SpellsScreen /></ErrorBoundary>;
      case "settings":
        return <ErrorBoundary name="Settings"><SettingsScreen /></ErrorBoundary>;
      default:
        return <ErrorBoundary name="Vaults"><VaultScreen /></ErrorBoundary>;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black flex items-center justify-center p-3 select-none">
      {/* Window frame */}
      <div className="h-full w-full max-w-[1400px] rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col bg-[#0a0a0f] shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="h-9 flex items-center gap-2 px-4 bg-[#0d0d14] border-b border-white/[0.06] shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <AlchemistIcon size={16} className="text-violet-500 ml-3" />
          <span className="text-xs text-zinc-600 ml-1.5 font-medium">
            Alchemist
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {shortcutHint().map((hint) => (
              <kbd
                key={hint}
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 bg-white/[0.04] rounded border border-white/[0.06]"
              >
                {hint}
              </kbd>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          {renderView()}
        </div>
      </div>
    </div>
  );
}
