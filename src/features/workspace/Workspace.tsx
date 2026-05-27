import { SchemaPanel } from "@/features/workspace/SchemaPanel";
import { ChatPanel } from "@/features/workspace/ChatPanel";
import { InspectorPanel } from "@/features/workspace/InspectorPanel";
import { useAppStore } from "@/state/app-store";

export function Workspace() {
  const activeSource = useAppStore((s) => s.activeSource);

  if (!activeSource) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0b10]">
        <div className="text-center">
          <p className="text-zinc-500 text-sm">Open a database to start querying.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Left: Schema panel */}
      <SchemaPanel tables={[]} />

      {/* Center: Chat */}
      <ChatPanel />

      {/* Right: Inspector */}
      <InspectorPanel />
    </div>
  );
}
