import { create } from "zustand";

export type DataSourceType = "sqlite" | "chromadb" | "mempalace" | null;

export interface RecentSource {
  path: string;
  fileName: string;
  type: DataSourceType;
  openedAt: string;
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  timestamp: string;
}

export interface QueryResultData {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
  mode: "sql" | "vector";
}

export type ResultTab = "table" | "chart" | "relevance";

export interface AppState {
  // Navigation
  activeView: "vault" | "workspace" | "spells" | "settings";
  setActiveView: (view: AppState["activeView"]) => void;

  // Data source
  activeSource: RecentSource | null;
  dataSourceType: DataSourceType;
  setActiveSource: (source: RecentSource | null) => void;

  // Recent sources
  recentSources: RecentSource[];
  addRecentSource: (source: RecentSource) => void;
  removeRecentSource: (path: string) => void;

  // Chat
  chatHistory: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // Current query
  currentQuery: string;
  setCurrentQuery: (query: string) => void;
  currentQueryPreview: string | null;
  setCurrentQueryPreview: (sql: string | null) => void;

  // Results
  currentResults: QueryResultData | null;
  setCurrentResults: (results: QueryResultData | null) => void;
  activeResultTab: ResultTab;
  setActiveResultTab: (tab: ResultTab) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeView: "vault",
  setActiveView: (view) => set({ activeView: view }),

  // Data source
  activeSource: null,
  dataSourceType: null,
  setActiveSource: (source) =>
    set({
      activeSource: source,
      dataSourceType: source?.type ?? null,
    }),

  // Recent sources
  recentSources: [],
  addRecentSource: (source) =>
    set((state) => ({
      recentSources: [
        source,
        ...state.recentSources.filter((s) => s.path !== source.path),
      ].slice(0, 10),
    })),
  removeRecentSource: (path) =>
    set((state) => ({
      recentSources: state.recentSources.filter((s) => s.path !== path),
    })),

  // Chat
  chatHistory: [],
  addChatMessage: (msg) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, msg],
    })),
  clearChat: () => set({ chatHistory: [] }),

  // Current query
  currentQuery: "",
  setCurrentQuery: (query) => set({ currentQuery: query }),
  currentQueryPreview: null,
  setCurrentQueryPreview: (sql) => set({ currentQueryPreview: sql }),

  // Results
  currentResults: null,
  setCurrentResults: (results) => set({ currentResults: results }),
  activeResultTab: "table",
  setActiveResultTab: (tab) => set({ activeResultTab: tab }),
}));
