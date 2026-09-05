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

export type InternalMessage = ResolveConnectMessage | RevokeOriginMessage;

export function isInternalMessage(message: unknown): message is InternalMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { kind?: unknown }).kind === AQUILIFER_INTERNAL_KIND
  );
}
