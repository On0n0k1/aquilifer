// Model-listing clients (SPEC §3) — what the add-provider auto-discovery
// flow and the popup's model switcher both call. Covers response mapping
// and the request shape (headers, URL), since callers depend on both.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listAnthropicModels } from './anthropic';
import { listOpenAICompatibleModels } from './openai-compatible';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listAnthropicModels', () => {
  it('maps id/display_name pairs and sends the expected request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'claude-opus-5', display_name: 'Claude Opus 5' },
          { id: 'claude-sonnet-5', display_name: 'Claude Sonnet 5' },
        ],
      }),
    );

    const models = await listAnthropicModels({ apiKey: 'sk-test' });

    expect(models).toEqual([
      { id: 'claude-opus-5', label: 'Claude Opus 5' },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
    ]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.anthropic.com/v1/models');
    expect(init.headers['x-api-key']).toBe('sk-test');
    expect(init.headers['anthropic-version']).toBeTruthy();
  });

  it('falls back to id when a model has no display_name', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ id: 'claude-opus-5' }] }),
    );

    const models = await listAnthropicModels({ apiKey: 'sk-test' });

    expect(models).toEqual([{ id: 'claude-opus-5', label: 'claude-opus-5' }]);
  });

  it('throws on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 401));

    await expect(listAnthropicModels({ apiKey: 'bad-key' })).rejects.toThrow();
  });
});

describe('listOpenAICompatibleModels', () => {
  it('trims a trailing slash and omits the auth header without an apiKey', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: 'llama-3' }] }));

    const models = await listOpenAICompatibleModels({
      baseUrl: 'http://localhost:8080/',
    });

    expect(models).toEqual([{ id: 'llama-3', label: 'llama-3' }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:8080/v1/models');
    expect(init.headers.authorization).toBeUndefined();
  });

  it('sends a bearer token when an apiKey is present', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await listOpenAICompatibleModels({
      baseUrl: 'http://localhost:8080',
      apiKey: 'sk-local',
    });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.authorization).toBe('Bearer sk-local');
  });

  it('throws on a non-ok response (e.g. /v1/models not implemented)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 404));

    await expect(
      listOpenAICompatibleModels({ baseUrl: 'http://localhost:8080' }),
    ).rejects.toThrow();
  });
});
