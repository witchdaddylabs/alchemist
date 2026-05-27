import { useState, useCallback, useRef } from "react";
import { Database, Shield, WifiOff, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VaultCard } from "@/components/vault/VaultCard";
import { useAppStore } from "@/state/app-store";
import { cn } from "@/lib/utils";

const featureBadges = [
  { label: "Local Only", icon: Shield },
  { label: "Read-Only", icon: Shield },
  { label: "No Account", icon: UserX },
  { label: "No Cloud API", icon: WifiOff },
];

export function VaultScreen() {
  const recentSources = useAppStore((s) => s.recentSources);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // TODO: handle file drop via Tauri dialog
  }, []);

  const handleOpenFile = useCallback(async () => {
    // TODO: Tauri file dialog for SQLite/ChromaDB/YAML
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0b0b10]">
      {/* Cosmic background texture */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-blue-500/4 blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-r from-violet-500/3 via-fuchsia-500/2 to-transparent blur-[80px] rotate-12" />
      </div>

      {/* Content */}
      <div
        ref={dropRef}
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-8 py-12 relative z-10 transition-all duration-200",
          isDragging && "bg-violet-500/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hero section */}
        <div className="flex flex-col items-center max-w-lg w-full">
          {/* Logo */}
          <div className="mb-6 relative">
            <svg
              viewBox="0 0 48 48"
              className="w-14 h-14 text-violet-500 drop-shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M24 6 L42 36 L6 36 Z" />
              <circle cx="24" cy="28" r="7" />
              <circle cx="24" cy="28" r="3" fill="currentColor" opacity="0.8" />
              <line x1="24" y1="6" x2="24" y2="12" strokeWidth="1" opacity="0.4" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="font-['Cinzel'] text-4xl md:text-5xl font-semibold tracking-[0.15em] text-[#f3f0ea] mb-3 text-center">
            ALCHEMIST
          </h1>

          {/* Subtitle */}
          <p className="text-violet-400 text-base md:text-lg font-normal mb-8 text-center">
            Ask your local database what it knows.
          </p>

          {/* CTA Button */}
          <Button
            onClick={handleOpenFile}
            className={cn(
              "h-11 px-8 rounded-xl text-sm font-medium",
              "bg-gradient-to-b from-violet-600 to-violet-700",
              "hover:from-violet-500 hover:to-violet-600",
              "shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.35)]",
              "text-white border border-violet-400/20",
              "transition-all duration-200"
            )}
          >
            <Database className="w-4 h-4 mr-2" />
            Open SQLite Database...
          </Button>

          {/* Drop hint */}
          <p className="text-xs text-zinc-500 mt-3 mb-8">
            or drag and drop a .db / .sqlite / .sqlite3 file
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
            {featureBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <Badge
                  key={badge.label}
                  variant="outline"
                  className={cn(
                    "h-7 px-2.5 rounded-full text-xs font-normal",
                    "bg-white/[0.03] border-white/[0.1] text-zinc-300",
                    "flex items-center gap-1.5"
                  )}
                >
                  <Icon className="w-3 h-3 text-violet-400/70" />
                  {badge.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Recent Vaults */}
        <div className="w-full max-w-md">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">
            Recent Vaults
          </h2>

          <div className="flex flex-col gap-2">
            {recentSources.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-600">
                  No recent databases. Open one to get started.
                </p>
              </div>
            ) : (
              recentSources.map((source) => (
                <VaultCard
                  key={source.path}
                  name={source.fileName}
                  metadata={source.summary}
                  onClick={() => {
                    useAppStore.getState().setActiveSource(source);
                    useAppStore.getState().setActiveView("workspace");
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
