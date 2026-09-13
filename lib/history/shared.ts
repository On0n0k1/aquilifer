// Common CRUD shape reused by every per-interface history module (SPEC §7).
// Each interface (generic, anthropicMessages, openaiChatCompletions) gets
// its own storage key and entry shape, but the same function names, so call
// sites feel identical regardless of which one they're using.

export interface BaseHistoryEntry {
  id: string;
  origin: string;
  timestamp: number;
}

const MAX_HISTORY_ENTRIES = 500;

export function createHistoryStore<T extends BaseHistoryEntry>(
  storageKey: string,
) {
  async function listHistory(): Promise<T[]> {
    const stored = await browser.storage.local.get(storageKey);
    return (stored[storageKey] as T[] | undefined) ?? [];
  }

  async function listHistoryForOrigin(origin: string): Promise<T[]> {
    const all = await listHistory();
    return all.filter((entry) => entry.origin === origin);
  }

  /** Count of attempts (any outcome) for `origin` within the last `windowMs`. */
  async function countRecentEntries(
    origin: string,
    windowMs: number,
  ): Promise<number> {
    const entries = await listHistoryForOrigin(origin);
    const cutoff = Date.now() - windowMs;
    return entries.filter((entry) => entry.timestamp >= cutoff).length;
  }

  async function appendHistoryEntry(entry: T): Promise<void> {
    const all = await listHistory();
    all.push(entry);
    const trimmed =
      all.length > MAX_HISTORY_ENTRIES
        ? all.slice(all.length - MAX_HISTORY_ENTRIES)
        : all;
    await browser.storage.local.set({ [storageKey]: trimmed });
  }

  async function clearHistory(): Promise<void> {
    await browser.storage.local.set({ [storageKey]: [] });
  }

  return {
    listHistory,
    listHistoryForOrigin,
    countRecentEntries,
    appendHistoryEntry,
    clearHistory,
  };
}
