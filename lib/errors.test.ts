import { describe, expect, it } from 'vitest';
import {
  AQUILIFER_ERRORS,
  PROVIDER_ERROR_PREFIX,
  codeForErrorMessage,
  dynamicErrorResult,
  dynamicStreamErrorEvent,
  errorResult,
  streamErrorEvent,
} from './errors';

describe('codeForErrorMessage', () => {
  it('returns a fixed identifier unchanged', () => {
    expect(codeForErrorMessage(AQUILIFER_ERRORS.RATE_LIMITED)).toBe(
      'rate_limited',
    );
  });

  it('normalizes a provider_error_<status> message to the fixed provider_error code', () => {
    expect(codeForErrorMessage('provider_error_401: bad key')).toBe(
      'provider_error',
    );
    expect(codeForErrorMessage(`${PROVIDER_ERROR_PREFIX}500`)).toBe(
      'provider_error',
    );
  });

  it('passes through an arbitrary message that is not the provider_error shape', () => {
    expect(codeForErrorMessage('chat_failed')).toBe('chat_failed');
  });
});

describe('errorResult', () => {
  it('builds a matching error/code pair from one fixed identifier', () => {
    expect(errorResult(AQUILIFER_ERRORS.NOT_CONNECTED)).toEqual({
      ok: false,
      error: 'not_connected',
      code: 'not_connected',
    });
  });
});

describe('dynamicErrorResult', () => {
  it('keeps the full message but normalizes the code for a provider error', () => {
    const result = dynamicErrorResult('provider_error_500: server exploded');
    expect(result).toEqual({
      ok: false,
      error: 'provider_error_500: server exploded',
      code: 'provider_error',
    });
  });

  it('uses the message itself as the code for a non-provider-error message', () => {
    expect(dynamicErrorResult('chat_failed')).toEqual({
      ok: false,
      error: 'chat_failed',
      code: 'chat_failed',
    });
  });
});

describe('streamErrorEvent', () => {
  it('builds a matching error/code pair shaped as a stream event', () => {
    expect(streamErrorEvent(AQUILIFER_ERRORS.STREAM_DISCONNECTED)).toEqual({
      type: 'error',
      error: 'stream_disconnected',
      code: 'stream_disconnected',
    });
  });
});

describe('dynamicStreamErrorEvent', () => {
  it('normalizes a provider error message to a stream event', () => {
    expect(dynamicStreamErrorEvent('provider_error_429: slow down')).toEqual({
      type: 'error',
      error: 'provider_error_429: slow down',
      code: 'provider_error',
    });
  });
});
