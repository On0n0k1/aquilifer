// Per-origin audit log for the `anthropicMessages` provider-specific
// interface (SPEC §5, §7). Kept separate from generic.ts on purpose — a
// native request/response doesn't fit the generic `{role, content}[]`
// shape (tool use, images, blocks), so entries here store a compact summary
// instead.

import { createHistoryStore, type BaseHistoryEntry } from './shared';

export interface AnthropicMessagesHistoryEntry extends BaseHistoryEntry {
  providerId: string;
  providerLabel: string;
  requestSummary: string;
  outcome:
    | { ok: true; responseSummary: string }
    | { ok: false; error: string };
  warnings?: string[];
}

const store = createHistoryStore<AnthropicMessagesHistoryEntry>(
  'history:anthropicMessages',
);

export const listHistory = store.listHistory;
export const listHistoryForOrigin = store.listHistoryForOrigin;
export const countRecentEntries = store.countRecentEntries;
export const appendHistoryEntry = store.appendHistoryEntry;
export const clearHistory = store.clearHistory;
