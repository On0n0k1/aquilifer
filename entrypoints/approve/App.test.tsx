// @vitest-environment jsdom
// Component tier (SPEC §11) — the switch-flow-aware provider filtering in
// this component is exactly the kind of logic a unit test can't see (it
// depends on rendered DOM and query-string parsing) but doesn't need a real
// browser extension loaded to verify, unlike the e2e tier.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AnthropicProvider,
  OpenAICompatibleProvider,
} from '../../lib/providers';
import App from './App';

const ANTHROPIC_PROVIDER: AnthropicProvider = {
  id: 'anthropic-1',
  type: 'anthropic',
  label: 'My Anthropic',
  apiKey: 'sk-test',
  model: 'claude-test',
};

const OPENAI_PROVIDER: OpenAICompatibleProvider = {
  id: 'openai-1',
  type: 'openai-compatible',
  label: 'My Local Llama',
  baseUrl: 'http://localhost:8080',
  model: 'llama-test',
};

function setQueryParams(params: Record<string, string>) {
  window.history.pushState({}, '', `/?${new URLSearchParams(params)}`);
}

beforeEach(() => {
  vi.spyOn(window, 'close').mockImplementation(() => {});
});

describe('plain connect (no requiredType)', () => {
  it('lists every provider and titles it as a connection request', async () => {
    setQueryParams({ origin: 'https://example.com' });
    await browser.storage.local.set({
      providers: [ANTHROPIC_PROVIDER, OPENAI_PROVIDER],
    });

    render(<App />);

    expect(await screen.findByText('Connection request')).toBeInTheDocument();
    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    expect(
      Array.from(select.options).map((option) => option.textContent),
    ).toEqual(['My Anthropic', 'My Local Llama']);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });
});

describe('switch flow (requiredType set)', () => {
  it('filters the dropdown to only the required provider type', async () => {
    setQueryParams({
      origin: 'https://example.com',
      requiredType: 'anthropic',
      currentProviderLabel: 'My Local Llama',
    });
    await browser.storage.local.set({
      providers: [ANTHROPIC_PROVIDER, OPENAI_PROVIDER],
    });

    render(<App />);

    expect(await screen.findByText('Switch provider')).toBeInTheDocument();
    expect(screen.getByText('My Local Llama')).toBeInTheDocument();
    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    expect(
      Array.from(select.options).map((option) => option.textContent),
    ).toEqual(['My Anthropic']);
  });

  it('disables Approve and shows a sign-up link when no provider of the required type exists', async () => {
    setQueryParams({
      origin: 'https://example.com',
      requiredType: 'anthropic',
    });
    await browser.storage.local.set({ providers: [OPENAI_PROVIDER] });

    render(<App />);

    expect(
      await screen.findByText(/don't have a anthropic provider configured/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      'https://console.anthropic.com/',
    );
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('points to Settings instead of a sign-up link for openai-compatible, which has no single sign-up destination', async () => {
    setQueryParams({
      origin: 'https://example.com',
      requiredType: 'openai-compatible',
    });
    await browser.storage.local.set({ providers: [ANTHROPIC_PROVIDER] });

    render(<App />);

    expect(await screen.findByText(/Add one in settings/)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Sign up' }),
    ).not.toBeInTheDocument();
  });
});

describe('approving', () => {
  it('sends resolveConnect with the selected provider id, then closes the popup', async () => {
    setQueryParams({ origin: 'https://example.com' });
    await browser.storage.local.set({ providers: [ANTHROPIC_PROVIDER] });
    const sendMessage = vi
      .spyOn(browser.runtime, 'sendMessage')
      .mockResolvedValue(undefined);

    render(<App />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Approve' }),
    );

    expect(sendMessage).toHaveBeenCalledWith({
      kind: 'aquilifer-internal',
      type: 'resolveConnect',
      origin: 'https://example.com',
      approve: true,
      providerId: 'anthropic-1',
    });
    expect(window.close).toHaveBeenCalled();
  });
});
