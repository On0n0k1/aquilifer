// @vitest-environment jsdom
// Component tier (SPEC §11) — the current-site lookup, rate-limit rollup,
// and in-use polling in this component all depend on rendered DOM and
// storage/message state a plain unit test can't see, but don't need a real
// browser extension loaded to verify, unlike the e2e tier.
import { render, screen } from '@testing-library/react';
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

  it('shows the in-use indicator only for a provider with an active request', async () => {
    vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue({
      activeProviderIds: [PROVIDER.id],
    } as never);

    render(<App />);

    expect(
      await screen.findByRole('img', { name: 'In use right now' }),
    ).toBeInTheDocument();
  });
});
