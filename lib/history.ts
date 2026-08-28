// Per-origin audit log (SPEC §7). Stateless: entries are written after a
// chat call completes and are never fed back into a future request — this
// is purely for the user (and, scoped to its own origin, the site) to
// review what's been asked.

import type { AquiliferChatParams } from './aquilifer-protocol';

export interface HistoryEntry {
  id: string;
  origin: string;
  timestamp: number;
  providerId: string;
  providerLabel: string;
  messages: AquiliferChatParams['messages'];
  outcome: { ok: true; message: string } | { ok: false; error: string };
}

const HISTORY_KEY = 'history';
const MAX_HISTORY_ENTRIES = 500;

export async function listHistory(): Promise<HistoryEntry[]> {
  const stored = await browser.storage.local.get(HISTORY_KEY);
  return (stored[HISTORY_KEY] as HistoryEntry[] | undefined) ?? [];
}

export async function listHistoryForOrigin(
  origin: string,
): Promise<HistoryEntry[]> {
  const all = await listHistory();
  return all.filter((entry) => entry.origin === origin);
}

export async function appendHistoryEntry(entry: HistoryEntry): Promise<void> {
  const all = await listHistory();
  all.push(entry);
  const trimmed =
    all.length > MAX_HISTORY_ENTRIES
      ? all.slice(all.length - MAX_HISTORY_ENTRIES)
      : all;
  await browser.storage.local.set({ [HISTORY_KEY]: trimmed });
}

export async function clearHistory(): Promise<void> {
  await browser.storage.local.set({ [HISTORY_KEY]: [] });
}
