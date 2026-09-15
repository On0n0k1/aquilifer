// Single source of truth for every Aquilifer error identifier (SPEC §5, §9).
// For the fixed identifiers, `.error` (the message) and `.code` are always
// the same string, by construction — call sites build the response/event
// from one of these instead of retyping the literal twice and risking the
// two copies drifting apart.

export const AQUILIFER_ERRORS = {
  UNKNOWN_ORIGIN: 'unknown_origin',
  UNKNOWN_METHOD: 'unknown_method',
  NOT_CONNECTED: 'not_connected',
  CONNECT_PENDING: 'connect_pending',
  CONNECT_DENIED: 'connect_denied',
  MISSING_MESSAGES: 'missing_messages',
  RATE_LIMITED: 'rate_limited',
  SWITCH_DENIED: 'switch_denied',
  NO_PROVIDER_OF_TYPE: 'no_provider_of_type',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  STREAMING_NOT_SUPPORTED: 'streaming_not_supported',
  STREAM_DISCONNECTED: 'stream_disconnected',
  PROVIDER_ERROR: 'provider_error',
  CHAT_FAILED: 'chat_failed',
} as const;

export type AquiliferErrorCode =
  (typeof AQUILIFER_ERRORS)[keyof typeof AQUILIFER_ERRORS];

/** Prefix an upstream HTTP failure's message is built with (SPEC §5) — the
 *  one message shape with dynamic detail text. Shared with
 *  `lib/llm-clients/shared.ts`'s `describeError()` so the prefix can't drift
 *  out of sync with what `codeForErrorMessage` below matches against. */
export const PROVIDER_ERROR_PREFIX = `${AQUILIFER_ERRORS.PROVIDER_ERROR}_`;

/** `.code` for a caught error's `.message`. Every fixed identifier above is
 *  already its own code; `provider_error_<status>: <raw body>` is the one
 *  message shape with dynamic detail text, normalized down to the fixed
 *  `provider_error` code so consumers never need to parse it. */
export function codeForErrorMessage(message: string): string {
  return message.startsWith(PROVIDER_ERROR_PREFIX)
    ? AQUILIFER_ERRORS.PROVIDER_ERROR
    : message;
}

/** A `request()` response's `{ ok: false, ... }` half, for a fixed error. */
export function errorResult(code: AquiliferErrorCode) {
  return { ok: false as const, error: code, code };
}

/** Same, for a dynamic caught error's message (e.g. `provider_error_...`). */
export function dynamicErrorResult(message: string) {
  return {
    ok: false as const,
    error: message,
    code: codeForErrorMessage(message),
  };
}

/** A stream Port's `{ type: 'error', ... }` event, for a fixed error. */
export function streamErrorEvent(code: AquiliferErrorCode) {
  return { type: 'error' as const, error: code, code };
}

/** Same, for a dynamic caught error's message. */
export function dynamicStreamErrorEvent(message: string) {
  return {
    type: 'error' as const,
    error: message,
    code: codeForErrorMessage(message),
  };
}
