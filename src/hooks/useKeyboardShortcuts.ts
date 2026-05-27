import { useEffect } from "react";
import { useAppStore } from "@/state/app-store";

/**
 * Global keyboard shortcuts for Alchemist.
 */
export function useKeyboardShortcuts() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const generatedSql = useAppStore((s) => s.generatedSql);
  const setGeneratedSql = useAppStore((s) => s.setGeneratedSql);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+O — Open vault
      if (isMeta && e.key === "o") {
        e.preventDefault();
        setActiveView("vault");
        return;
      }

      // Cmd+Enter — Run query (workspace only)
      if (isMeta && e.key === "Enter") {
        // Only works if we're on workspace and have generated SQL
        if (activeView === "workspace" && generatedSql) {
          e.preventDefault();
          // Find the Run Query button and click it
          // We dispatch via store state since we can't directly trigger React state
          const runBtn = document.querySelector(
            'button:has(svg.lucide-play)'
          ) as HTMLButtonElement;
          runBtn?.click();
        }
        return;
      }

      // Cmd+S — Save as Spell (workspace only)
      if (isMeta && e.key === "s") {
        if (activeView === "workspace" && generatedSql) {
          e.preventDefault();
          // Find the Save as Spell button
          const buttons = document.querySelectorAll("button");
          for (const btn of buttons) {
            if (btn.textContent?.includes("Save as Spell")) {
              btn.click();
              break;
            }
          }
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeView, generatedSql, setActiveView, setGeneratedSql]);
}
