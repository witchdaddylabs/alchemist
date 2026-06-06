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
const RECENT_SOURCES_KEY = "alchemist_recent_sources";

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

function loadRecentSources(): RecentSource[] {
  try {
    const raw = localStorage.getItem(RECENT_SOURCES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    localStorage.removeItem(RECENT_SOURCES_KEY);
    return [];
  }
}

function persistRecentSources(sources: RecentSource[]) {
  try {
    localStorage.setItem(RECENT_SOURCES_KEY, JSON.stringify(sources.slice(0, 5)));
  } catch {
    // localStorage might be full or disabled
  }
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

  // Provider
  activeProvider: ProviderConfigState;
  setActiveProvider: (config: ProviderConfigState) => void;
  savedProviders: Record<string, ProviderConfigState>;
  setSavedProviders: (providers: Record<string, ProviderConfigState>) => void;

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

  // Provider
  activeProvider: { type: "ollama", url: "http://localhost:11434", model: "llama3.2" },
  setActiveProvider: (config: ProviderConfigState) => set({ activeProvider: config }),
  savedProviders: {} as Record<string, ProviderConfigState>,
  setSavedProviders: (providers) => set({ savedProviders: providers }),

  // Recent sources
  recentSources: loadRecentSources(),
  addRecentSource: (source) =>
    set((state) => {
      const recentSources = [
        source,
        ...state.recentSources.filter((s) => s.path !== source.path),
      ].slice(0, 5);
      persistRecentSources(recentSources);
      return { recentSources };
    }),
  removeRecentSource: (path) =>
    set((state) => {
      const recentSources = state.recentSources.filter((s) => s.path !== path);
      persistRecentSources(recentSources);
      return { recentSources };
    }),

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
    set((state) => {
      if (state.spells.some((s) => s.id === spell.id)) return state;
      return { spells: [spell, ...state.spells] };
    }),
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
}));
