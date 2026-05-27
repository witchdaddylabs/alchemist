import { create } from "zustand";

export type DataSourceType = "sqlite" | "chromadb" | "mempalace" | null;

export interface RecentSource {
  path: string;
  fileName: string;
  type: DataSourceType;
  openedAt: string;
  summary: string;
}

const LAST_SOURCE_KEY = "alchemist_last_source";

export function persistLastSource(source: RecentSource) {
  try {
    localStorage.setItem(LAST_SOURCE_KEY, JSON.stringify(source));
  } catch {
    // localStorage might be full or disabled
  }
}

export function clearLastSource() {
  localStorage.removeItem(LAST_SOURCE_KEY);
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

export interface Spell {
  id: string;
  name: string;
  description: string;
  sql: string;
  mode: "sql" | "vector";
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type PrivacyMode = "minimal" | "standard" | "full";

export interface SettingsState {
  cloudConsent: boolean;
  cloudConsentAcknowledged: boolean;
  privacyMode: PrivacyMode;
  setCloudConsent: (v: boolean) => void;
  setPrivacyMode: (v: PrivacyMode) => void;
}

export interface ProviderConfigState {
  type: string;
  url: string;
  model: string;
}

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
  generatedSql: string | null;
  setGeneratedSql: (sql: string | null) => void;
  currentQueryPreview: string | null;
  setCurrentQueryPreview: (sql: string | null) => void;

  // Results
  currentResults: QueryResultData | null;
  setCurrentResults: (results: QueryResultData | null) => void;
  activeResultTab: ResultTab;
  setActiveResultTab: (tab: ResultTab) => void;

  // Spells
  spells: Spell[];
  addSpell: (spell: Spell) => void;
  updateSpell: (id: string, updates: Partial<Spell>) => void;
  deleteSpell: (id: string) => void;

  // Settings
  settings: SettingsState;
  activeProvider: ProviderConfigState;
  setActiveProvider: (config: ProviderConfigState) => void;
}

const defaultSettings: SettingsState = {
  cloudConsent: false,
  cloudConsentAcknowledged: false,
  privacyMode: "standard",
  setCloudConsent: () => {},
  setPrivacyMode: () => {},
};

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeView: "vault",
  setActiveView: (view) => set({ activeView: view }),

  // Data source
  activeSource: null,
  dataSourceType: null,
  setActiveSource: (source) => {
    if (source) persistLastSource(source);
    else clearLastSource();
    set({
      activeSource: source,
      dataSourceType: source?.type ?? null,
    });
  },

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
  generatedSql: null,
  setGeneratedSql: (sql) => set({ generatedSql: sql }),
  currentQueryPreview: null,
  setCurrentQueryPreview: (sql) => set({ currentQueryPreview: sql }),

  // Results
  currentResults: null,
  setCurrentResults: (results) => set({ currentResults: results }),
  activeResultTab: "table",
  setActiveResultTab: (tab) => set({ activeResultTab: tab }),

  // Spells
  spells: [],
  addSpell: (spell) =>
    set((state) => ({
      spells: [spell, ...state.spells],
    })),
  updateSpell: (id, updates) =>
    set((state) => ({
      spells: state.spells.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    })),
  deleteSpell: (id) =>
    set((state) => ({
      spells: state.spells.filter((s) => s.id !== id),
    })),

  // Settings
  settings: {
    ...defaultSettings,
    setCloudConsent: (v) =>
      set((state) => ({
        settings: {
          ...state.settings,
          cloudConsent: v,
          cloudConsentAcknowledged: true,
        },
      })),
    setPrivacyMode: (v) =>
      set((state) => ({
        settings: { ...state.settings, privacyMode: v },
      })),
  },
  activeProvider: { type: "ollama", url: "http://localhost:11434", model: "llama3.2" },
  setActiveProvider: (config) => set({ activeProvider: config }),
}));
