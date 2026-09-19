import { PROVIDER_ERROR_PREFIX } from '../errors';

export interface ChatResult {
  text: string;
  /** The model the provider's own response reports having used, if any. */
  model?: string;
}

/** One entry from a provider's own model-listing endpoint (SPEC §3) —
 *  `label` is a human-readable name when the provider supplies one,
 *  `id` otherwise. */
export interface ModelInfo {
  id: string;
  label: string;
}

export async function describeError(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  return `${PROVIDER_ERROR_PREFIX}${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`;
}

/**
 * Reads a Server-Sent Events body incrementally, yielding each `data:`
 * line's payload as it arrives. Shared by both providers' streaming
 * clients — Anthropic and OpenAI-compatible both frame deltas this way,
 * they just disagree on what's inside the JSON payload.
 */
export async function* readSseDataLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        yield trimmed.slice('data:'.length).trim();
      }
    }
  } finally {
    reader.releaseLock();
  }
}
