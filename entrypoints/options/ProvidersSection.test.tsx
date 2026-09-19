// @vitest-environment jsdom
// Component tier (SPEC §11) — specifically covers what the e2e tier
// can't: the openai-compatible discovery paths need
// browser.permissions.request() for a new host, which pops a real native
// Chrome dialog that only resolves on an actual human click (confirmed by
// hand). Mocking that call directly here, plus fetch for /v1/models and
// /v1/chat/completions, exercises the real component logic without ever
// touching real browser chrome. The Anthropic discovery-success path is
// covered for real in tests/e2e/provider-model-discovery.spec.ts, since it
// never calls permissions.request() (api.anthropic.com is a fixed
// host_permission).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProvidersSection from './ProvidersSection';

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
  // `as never`: vi.spyOn picks the wrong overload on this API's multiple
  // signatures (same quirk as entrypoints/popup/App.test.tsx).
  vi.spyOn(browser.permissions, 'request').mockResolvedValue(true as never);
});

async function fillOpenAICompatibleForm(label: string) {
  await userEvent.selectOptions(
    screen.getByLabelText('Type'),
    'openai-compatible',
  );
  await userEvent.type(screen.getByLabelText('Label'), label);
  await userEvent.type(
    screen.getByLabelText('Base URL'),
    'http://localhost:8080',
  );
}

describe('discovery succeeds', () => {
  it('auto-picks the first model returned, no manual field needed', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ id: 'llama-3' }, { id: 'llama-3-small' }] }),
    );

    render(<ProvidersSection />);
    await fillOpenAICompatibleForm('Local Llama');
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(await screen.findByText('Local Llama')).toBeInTheDocument();
    expect(screen.getByText(/llama-3\b/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
  });
});

describe('discovery fails (e.g. /v1/models not implemented)', () => {
  it('reveals a manual model field and verifies with a real completion', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/v1/models')) return jsonResponse({}, false, 404);
      if (url.endsWith('/v1/chat/completions')) {
        return jsonResponse({
          choices: [{ message: { content: 'OK' } }],
          model: 'llama-3-reported',
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    render(<ProvidersSection />);
    await fillOpenAICompatibleForm('Local Llama');
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(
      await screen.findByText(/Couldn.t automatically list available models/),
    ).toBeInTheDocument();
    const modelField = screen.getByLabelText('Model');
    expect(modelField).toBeInTheDocument();

    await userEvent.type(modelField, 'llama-3');
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(await screen.findByText('Local Llama')).toBeInTheDocument();
    expect(screen.getByText(/llama-3-reported/)).toBeInTheDocument();
  });

  it('retrying with different Base URL resets the manual-fallback state', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 404));

    render(<ProvidersSection />);
    await fillOpenAICompatibleForm('Local Llama');
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByLabelText('Model')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Base URL'));
    await userEvent.type(screen.getByLabelText('Base URL'), 'http://x:1');

    expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
  });
});
