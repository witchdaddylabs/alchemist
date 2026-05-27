import { invoke } from "@tauri-apps/api/core";

// ── SQLite Vault commands ──

export async function openVault(path: string) {
  return invoke<VaultSummary>("open_vault", { path });
}

export async function getSchema(path: string) {
  return invoke<TableSchema[]>("get_schema", { path });
}

export async function runQuery(path: string, sql: string) {
  return invoke<QueryResult>("run_query", { path, sql });
}

export async function validateSql(sql: string) {
  return invoke<ValidatedQuery>("validate_sql", { sql });
}

export async function validateAndRun(path: string, sql: string) {
  return invoke<QueryResult>("validate_and_run", { path, sql });
}

// ── ChromaDB / Palace commands ──

export async function discoverPalace(path: string) {
  return invoke<PalaceDiscovery>("discover_palace", { path });
}

export async function listCollections(palacePath: string) {
  return invoke<CollectionInfo[]>("list_collections", { palacePath });
}

export async function searchDocuments(
  palacePath: string,
  query: string,
  collectionName?: string,
  limit?: number
) {
  return invoke<SearchResult[]>("search_documents", {
    palacePath,
    query,
    collectionName: collectionName ?? null,
    limit: limit ?? null,
  });
}

export async function getPalaceInfo(palacePath: string) {
  return invoke<PalaceInfo>("get_palace_info", { palacePath });
}

// ── MemPalace commands ──

export async function parseMempalace(path?: string) {
  return invoke<MemPalaceStructure>("parse_mempalace", {
    path: path ?? null,
  });
}

// ── LLM / Provider commands ──

export async function checkOllama() {
  return invoke<ProviderHealth>("check_ollama");
}

export async function generateQuery(params: {
  question: string;
  schemaJson?: string;
  palaceJson?: string;
  providerType?: string;
  providerUrl?: string;
  providerModel?: string;
}) {
  return invoke<GeneratedQuery>("generate_query", {
    question: params.question,
    schemaJson: params.schemaJson ?? null,
    palaceJson: params.palaceJson ?? null,
    providerType: params.providerType ?? null,
    providerUrl: params.providerUrl ?? null,
    providerModel: params.providerModel ?? null,
  });
}

export async function getProviderConfig() {
  return invoke<ProviderConfig>("get_provider_config");
}

export async function storeApiKey(account: string, key: string) {
  return invoke<void>("store_api_key", { account, key });
}

export async function checkApiKey(account: string) {
  return invoke<boolean>("check_api_key", { account });
}

export async function deleteApiKey(account: string) {
  return invoke<void>("delete_api_key", { account });
}

// ── Types ──

export interface VaultSummary {
  path: string;
  fileName: string;
  tableCount: number;
  sizeBytes: number;
  openedAt: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  rowCount: number | null;
}

export interface ColumnSchema {
  name: string;
  declaredType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  foreignKeyTarget: string | null;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
}

export interface ValidatedQuery {
  originalSql: string;
  finalSql: string;
  checks: SafetyCheck[];
  wasAmended: boolean;
  amendmentNote: string | null;
}

export interface SafetyCheck {
  code: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface PalaceDiscovery {
  path: string;
  fileName: string;
  parentDirectory: string;
  sizeBytes: number;
  collectionCount: number;
  totalDocuments: number;
  segmentCount: number;
}

export interface CollectionInfo {
  id: string;
  name: string;
  dimension: number | null;
  documentCount: number;
  configJson: string;
}

export interface SearchResult {
  embeddingId: number;
  segmentId: string;
  documentText: string;
  metadata: Record<string, string>;
  relevanceHint: string;
  score: number | null;
  createdAt: string;
}

export interface PalaceInfo {
  discovery: PalaceDiscovery;
  collections: CollectionInfo[];
}

export interface MemPalaceStructure {
  wings: WingStructure[];
  totalWings: number;
  totalRooms: number;
  totalDrawers: number;
  sourceFile: string;
}

export interface WingStructure {
  name: string;
  path: string | null;
  rooms: RoomStructure[];
  roomCount: number | null;
}

export interface RoomStructure {
  name: string;
  keywords: string[];
  entities: string[];
  drawers: DrawerStructure[];
  drawerCount: number | null;
}

export interface DrawerStructure {
  name: string;
  keywords: string[];
  descriptions: string[];
  entities: string[];
  drawerCount: number | null;
}

export interface GeneratedQuery {
  question: string;
  sql: string | null;
  searchTerms: string[] | null;
  mode: string;
  rawResponse: string;
  provider: string;
  model: string;
  elapsedMs: number;
}

export interface ProviderHealth {
  providerType: string;
  reachable: boolean;
  modelCount: number;
  models: string[];
  error: string | null;
}

export interface ProviderConfig {
  providerType: string;
  ollamaUrl: string;
  ollamaModel: string;
  openaiUrl: string;
  openaiModel: string;
  hasOpenaiKey: boolean;
}
