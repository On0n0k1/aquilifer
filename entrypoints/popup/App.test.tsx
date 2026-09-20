// @vitest-environment jsdom
// Component tier (SPEC §11) — the current-site lookup, rate-limit rollup,
// and in-use polling in this component all depend on rendered DOM and
// storage/message state a plain unit test can't see, but don't need a real
// browser extension loaded to verify, unlike the e2e tier.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnthropicProvider } from '../../lib/providers';
import App from './App';

const PROVIDER: AnthropicProvider = {
  id: 'anthropic-1',
  type: 'anthropic',
  label: 'My Anthropic',
  apiKey: 'sk-test',
  model: 'claude-test',
};

// fake-browser's tabs.create() needs a `windows` mock it deliberately
// doesn't ship (windows.create/getCurrent are stubbed as "not mocked" and
// crash `tabs.query`'s `currentWindow` matching) — stubbing
// `browser.tabs.query` directly sidesteps that rather than fighting the
// fake's internal window-tracking.
//
// The `as never` casts below work around a vi.spyOn/TS quirk with
// overloaded WebExtension API signatures (sendMessage/tabs.query each have
// a void-returning callback-style overload TS's inference latches onto
// instead of the Promise-returning one actually used here).
function mockActiveTabUrl(url: string) {
  vi.spyOn(browser.tabs, 'query').mockResolvedValue([{ url }] as never);
}

beforeEach(() => {
  vi.spyOn(browser.tabs, 'query').mockResolvedValue([] as never);
  // Every render polls this on mount — stub a harmless default so tests
  // that don't care about the in-use indicator don't have to think about
  // it, matching real behavior when nothing's currently active.
  vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue({
    activeProviderIds: [],
  } as never);
});

describe('no providers configured', () => {
  it('shows the empty state and opens Options from it', async () => {
    const openOptionsPage = vi
      .spyOn(browser.runtime, 'openOptionsPage')
      .mockResolvedValue(undefined);

    render(<App />);

    expect(
      await screen.findByText('No providers configured yet.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add a provider' }),
    );
    expect(openOptionsPage).toHaveBeenCalled();
  });
});

describe('providers configured', () => {
  beforeEach(async () => {
    await browser.storage.local.set({ providers: [PROVIDER] });
  });

  it('lists providers and reports the current site as not connected when there is no grant', async () => {
    mockActiveTabUrl('https://example.com/');

    render(<App />);

    expect(await screen.findByText('My Anthropic')).toBeInTheDocument();
    expect(
      screen.getByText("This site isn't connected to a provider."),
    ).toBeInTheDocument();
  });

  it("shows the current site's connection and rate-limit standing when it's connected", async () => {
    mockActiveTabUrl('https://example.com/');
    await browser.storage.local.set({
      originGrants: { 'https://example.com': PROVIDER.id },
    });

    render(<App />);

    expect(
      await screen.findByText(/This site is connected to/),
    ).toBeInTheDocument();
    // Appears twice: once in the current-site callout, once in the list.
    expect(screen.getAllByText('My Anthropic')).toHaveLength(2);
    // No history entries logged yet, so the worst tier is 0 of its
    // threshold — the global tier's default (lib/rate-limits.ts).
    expect(
      screen.getByText('0 / 40 requests in the current window'),
    ).toBeInTheDocument();
  });

  it('disconnecting the current site revokes it and reverts to not-connected', async () => {
    mockActiveTabUrl('https://example.com/');
    await browser.storage.local.set({
      originGrants: { 'https://example.com': PROVIDER.id },
    });
    const sendMessage = vi
      .spyOn(browser.runtime, 'sendMessage')
      .mockImplementation(async (message) => {
        if ((message as { type?: string })?.type === 'getActiveRequests') {
          return { activeProviderIds: [] };
        }
        return undefined;
      });

    render(<App />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Disconnect' }),
    );

    expect(sendMessage).toHaveBeenCalledWith({
      kind: 'aquilifer-internal',
      type: 'revokeOrigin',
      origin: 'https://example.com',
    });
    expect(
      await screen.findByText("This site isn't connected to a provider."),
    ).toBeInTheDocument();
  });

  it('shows the in-use indicator only for a provider with an active request', async () => {
    vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue({
      activeProviderIds: [PROVIDER.id],
    } as never);

    render(<App />);

    expect(
      await screen.findByRole('img', { name: 'In use right now' }),
    ).toBeInTheDocument();
  });

  it('sets a non-default provider as default', async () => {
    const OTHER_PROVIDER: AnthropicProvider = {
      id: 'anthropic-2',
      type: 'anthropic',
      label: 'Other Anthropic',
      apiKey: 'sk-test-2',
      model: 'claude-test-2',
    };
    await browser.storage.local.set({
      providers: [PROVIDER, OTHER_PROVIDER],
      defaultProviderId: PROVIDER.id,
    });

    render(<App />);
    const otherRow = (await screen.findByText('Other Anthropic')).closest('li');
    if (!otherRow) throw new Error('row not found');

    await userEvent.click(
      within(otherRow).getByRole('button', { name: 'Set Default' }),
    );

    expect(await within(otherRow).findByText('Default')).toBeInTheDocument();
    const myRow = screen.getByText('My Anthropic').closest('li');
    if (!myRow) throw new Error('row not found');
    expect(
      within(myRow).getByRole('button', { name: 'Set Default' }),
    ).toBeInTheDocument();
  });

  it('picking a different model saves it and closes the picker', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: 'claude-test', display_name: 'Claude Test' },
          { id: 'claude-other', display_name: 'Claude Other' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Change' }),
    );

    const combobox = await screen.findByRole('combobox');
    await userEvent.selectOptions(combobox, 'claude-other');

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('claude-other')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('re-picking the already-active model also closes the picker', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 'claude-test', display_name: 'Claude Test' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Change' }),
    );

    const combobox = await screen.findByRole('combobox');
    // Passing the raw id string 'claude-test' here would be ambiguous:
    // jsdom's userEvent matches by value OR label text, and the hidden
    // placeholder option's displayed text is also "claude-test" (it shows
    // the current model's name). Resolving the real <option> by its
    // visible label first sidesteps that collision.
    await userEvent.selectOptions(
      combobox,
      within(combobox).getByRole('option', { name: 'Claude Test' }),
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('claude-test')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
