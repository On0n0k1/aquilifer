export const AQUILIFER_PAGE_SOURCE = 'aquilifer-page';
export const AQUILIFER_CONTENT_SOURCE = 'aquilifer-content';

export type AquiliferMethod = 'connect' | 'disconnect' | 'chat' | 'getHistory';

export interface AquiliferChatParams {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

export interface AquiliferRequestPayload {
  method: AquiliferMethod;
  params?: AquiliferChatParams;
}

export type AquiliferResponsePayload =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

export interface AquiliferPageMessage {
  source: typeof AQUILIFER_PAGE_SOURCE;
  id: string;
  payload: AquiliferRequestPayload;
}

export interface AquiliferContentMessage {
  source: typeof AQUILIFER_CONTENT_SOURCE;
  id: string;
  response: AquiliferResponsePayload;
}
