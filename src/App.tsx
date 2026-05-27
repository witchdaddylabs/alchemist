import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore, type RecentSource } from "@/state/app-store";
import { parseMempalace } from "@/lib/tauri";

function App() {
  const setActiveSource = useAppStore((s) => s.setActiveSource);
  const addRecentSource = useAppStore((s) => s.addRecentSource);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. Try last-used source from localStorage
      const lastRaw = localStorage.getItem("alchemist_last_source");
      if (lastRaw) {
        try {
          const last: RecentSource = JSON.parse(lastRaw);
          setActiveSource(last);
          addRecentSource(last);
          setActiveView("workspace");
          setReady(true);
          return;
        } catch {
          localStorage.removeItem("alchemist_last_source");
        }
      }

      // 2. Auto-discover MemPalace (~/.mempalace/)
      try {
        const palace = await parseMempalace();
        if (palace && palace.wings.length > 0) {
          const source: RecentSource = {
            path: "~/.mempalace/",
            fileName: "MemPalace",
            type: "mempalace",
            openedAt: new Date().toISOString(),
            summary: `${palace.totalWings} wings, ${palace.totalRooms} rooms, ${palace.totalDrawers} drawers`,
          };
          setActiveSource(source);
          addRecentSource(source);
          setActiveView("workspace");
        }
      } catch {
        // No MemPalace found — fall through to vault screen
      }

      setReady(true);
    };

    init();
  }, []);

  if (!ready) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0b0b10]">
        <div className="flex flex-col items-center gap-3">
          <svg
            viewBox="0 0 48 48"
            className="w-10 h-10 text-violet-500 animate-pulse"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M24 6 L42 36 L6 36 Z" />
            <circle cx="24" cy="28" r="7" />
            <circle cx="24" cy="28" r="3" fill="currentColor" opacity="0.8" />
            <line x1="24" y1="6" x2="24" y2="12" strokeWidth="1" opacity="0.4" />
          </svg>
          <span className="text-xs text-zinc-600">Initialising...</span>
        </div>
      </div>
    );
  }

  return <AppShell />;
}

export default App;
