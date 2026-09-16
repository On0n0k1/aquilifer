// Per-origin audit log for the `openaiChatCompletions` provider-specific
// interface (SPEC §5, §7). Kept separate from generic.ts and
// anthropic-messages.ts on purpose — same reasoning: a native
// request/response doesn't fit the generic `{role, content}[]` shape, so
// entries here store a compact summary instead.

import { type BaseHistoryEntry, createHistoryStore } from './shared';

export interface OpenAIChatCompletionsHistoryEntry extends BaseHistoryEntry {
  providerId: string;
  providerLabel: string;
  requestSummary: string;
  outcome: { ok: true; responseSummary: string } | { ok: false; error: string };
  warnings?: string[];
}

const store = createHistoryStore<OpenAIChatCompletionsHistoryEntry>(
  'history:openaiChatCompletions',
);

export const listHistory = store.listHistory;
export const listHistoryForOrigin = store.listHistoryForOrigin;
export const countRecentEntries = store.countRecentEntries;
export const appendHistoryEntry = store.appendHistoryEntry;
export const clearHistory = store.clearHistory;
