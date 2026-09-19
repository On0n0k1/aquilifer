// Extension-internal control messages (background <-> approve/popup pages).
// Distinct from the page-facing protocol in aquilifer-protocol.ts: these never
// cross the content-script relay and a website can never send one.

export const AQUILIFER_INTERNAL_KIND = 'aquilifer-internal';

export type ResolveConnectMessage =
  | {
      kind: typeof AQUILIFER_INTERNAL_KIND;
      type: 'resolveConnect';
      origin: string;
      approve: true;
      providerId: string;
    }
  | {
      kind: typeof AQUILIFER_INTERNAL_KIND;
      type: 'resolveConnect';
      origin: string;
      approve: false;
    };

export interface RevokeOriginMessage {
  kind: typeof AQUILIFER_INTERNAL_KIND;
  type: 'revokeOrigin';
  origin: string;
}

/** Sent by unlock.html after it calls `unlockVault()` itself (a privileged
 *  page has the same storage access as background) — this just tells
 *  background, which is the one tracking the pending request(s) waiting on
 *  it, that it can resume (or give up, if the popup was closed/denied). */
export interface ResolveUnlockMessage {
  kind: typeof AQUILIFER_INTERNAL_KIND;
  type: 'resolveUnlock';
  unlocked: boolean;
}

/** Polled by the toolbar popup (SPEC — visual design) for its "in use"
 *  indicator. Which providers currently have a request in flight only
 *  exists as in-memory state in background — everything else the popup
 *  needs (providers, grants, rate-limit history) it reads straight out of
 *  storage itself, the same privileged-page pattern Options already uses. */
export interface GetActiveRequestsMessage {
  kind: typeof AQUILIFER_INTERNAL_KIND;
  type: 'getActiveRequests';
}

export type InternalMessage =
  | ResolveConnectMessage
  | RevokeOriginMessage
  | ResolveUnlockMessage
  | GetActiveRequestsMessage;

export function isInternalMessage(
  message: unknown,
): message is InternalMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { kind?: unknown }).kind === AQUILIFER_INTERNAL_KIND
  );
}
