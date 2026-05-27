import { Sidebar } from "@/components/layout/Sidebar";
import { VaultScreen } from "@/features/vault/VaultScreen";
import { Workspace } from "@/features/workspace/Workspace";
import { useAppStore } from "@/state/app-store";

export function AppShell() {
  const activeView = useAppStore((s) => s.activeView);

  const renderView = () => {
    switch (activeView) {
      case "vault":
        return <VaultScreen />;
      case "workspace":
        return <Workspace />;
      case "spells":
        return (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Spells — Coming Soon
          </div>
        );
      case "settings":
        return (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Settings — Coming Soon
          </div>
        );
      default:
        return <VaultScreen />;
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
          <span className="text-xs text-zinc-600 ml-3 font-medium">
            Alchemist
          </span>
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
