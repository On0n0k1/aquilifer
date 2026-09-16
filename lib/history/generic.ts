// Per-origin audit log for the generic chat/stream interface (SPEC §7).
// Stateless: entries are written after a call completes and are never fed
// back into a future request — this is purely for the user (and, scoped to
// its own origin, the site) to review what's been asked.

import type { AquiliferChatParams } from '../public-api';
import { type BaseHistoryEntry, createHistoryStore } from './shared';

export interface HistoryEntry extends BaseHistoryEntry {
  providerId: string;
  providerLabel: string;
  messages: AquiliferChatParams['messages'];
  outcome: { ok: true; message: string } | { ok: false; error: string };
  /** Non-fatal flags, e.g. 'large_request', or 'rate_limited' on a block. */
  warnings?: string[];
}

const store = createHistoryStore<HistoryEntry>('history');

export const listHistory = store.listHistory;
export const listHistoryForOrigin = store.listHistoryForOrigin;
export const countRecentEntries = store.countRecentEntries;
export const appendHistoryEntry = store.appendHistoryEntry;
export const clearHistory = store.clearHistory;
