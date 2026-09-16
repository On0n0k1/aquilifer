// Canned provider responses (SPEC §11, §12) — checked-in, hand-written data
// shaped like Anthropic's Messages API and an OpenAI-compatible chat-
// completions endpoint, both a plain JSON response and a raw SSE byte
// stream. Scenarios replay these through `context.route()` instead of
// hand-rolling a mock body per test, so a provider's response shape only
// needs updating in one place.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Route } from '@playwright/test';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURES = {
  ANTHROPIC_MESSAGES: 'anthropic-messages.json',
  ANTHROPIC_MESSAGES_STREAM: 'anthropic-messages-stream.sse',
  OPENAI_CHAT_COMPLETIONS: 'openai-chat-completions.json',
  OPENAI_CHAT_COMPLETIONS_STREAM: 'openai-chat-completions-stream.sse',
} as const;

function readFixture(filename: string): string {
  return fs.readFileSync(path.join(dirname, filename), 'utf-8');
}

/** Fulfills a `context.route()` handler with a fixture's raw JSON body. */
export function fulfillJson(route: Route, filename: string): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: readFixture(filename),
  });
}

/** Fulfills a `context.route()` handler with a fixture's raw SSE byte
 *  stream — the provider's exact wire framing, not a JSON-encoded chunk
 *  array, so it exercises the real `readSseDataLines` parsing path. */
export function fulfillSse(route: Route, filename: string): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: readFixture(filename),
  });
}
