"use client";

export interface TabRefreshEntry {
  lastRefreshedAt: string | null;
  inFlight: boolean;
  lastError: string | null;
}

const STORAGE_KEY = "hl:admin:refresh-state:v1";
const listeners = new Set<() => void>();
const EMPTY_ENTRY: TabRefreshEntry = {
  lastRefreshedAt: null,
  inFlight: false,
  lastError: null,
};

let memoryMap: Record<string, TabRefreshEntry> | null = null;

function readStore(): Record<string, TabRefreshEntry> {
  if (typeof window === "undefined") return {};
  if (memoryMap) return memoryMap;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryMap = {};
      return memoryMap;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      memoryMap = {};
      return memoryMap;
    }
    const cleaned: Record<string, TabRefreshEntry> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const rec = v as Record<string, unknown>;
        cleaned[k] = {
          lastRefreshedAt:
            typeof rec.lastRefreshedAt === "string" ? rec.lastRefreshedAt : null,
          // Never strand inFlight=true after full page reload or tab reopen
          inFlight: false,
          lastError: typeof rec.lastError === "string" ? rec.lastError : null,
        };
      }
    }
    memoryMap = cleaned;
    return memoryMap;
  } catch {
    memoryMap = {};
    return memoryMap;
  }
}

function writeStore(next: Record<string, TabRefreshEntry>): void {
  memoryMap = next;
  if (typeof window !== "undefined") {
    try {
      const persisted: Record<string, TabRefreshEntry> = {};
      for (const [k, v] of Object.entries(next)) {
        persisted[k] = {
          lastRefreshedAt: v.lastRefreshedAt,
          inFlight: false,
          lastError: v.lastError,
        };
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore quota / private browsing storage restrictions
    }
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeRefreshStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTabRefreshEntry(tabKey: string): TabRefreshEntry {
  return readStore()[tabKey] ?? EMPTY_ENTRY;
}

export function getServerRefreshEntry(): TabRefreshEntry {
  return EMPTY_ENTRY;
}

export function markRefreshStarted(tabKey: string): void {
  const cur = readStore();
  const prev = cur[tabKey] ?? EMPTY_ENTRY;
  writeStore({
    ...cur,
    [tabKey]: {
      ...prev,
      inFlight: true,
      lastError: null,
    },
  });
}

export function markRefreshSucceeded(tabKey: string, atIso?: string): void {
  const cur = readStore();
  writeStore({
    ...cur,
    [tabKey]: {
      lastRefreshedAt: atIso ?? new Date().toISOString(),
      inFlight: false,
      lastError: null,
    },
  });
}

export function markRefreshFailed(tabKey: string, message: string): void {
  const cur = readStore();
  const prev = cur[tabKey] ?? EMPTY_ENTRY;
  writeStore({
    ...cur,
    [tabKey]: {
      ...prev,
      inFlight: false,
      lastError: message,
    },
  });
}

export async function runTrackedRefresh<T>(
  tabKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  markRefreshStarted(tabKey);
  try {
    const result = await fn();
    markRefreshSucceeded(tabKey);
    return result;
  } catch (err) {
    markRefreshFailed(tabKey, err instanceof Error ? err.message : "Refresh failed.");
    throw err;
  }
}
