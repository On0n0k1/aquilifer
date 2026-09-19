// @vitest-environment jsdom
// Component tier (SPEC §11) — proves generic-chat messages render as real
// markdown (headings, code blocks) rather than raw text, and that the
// provider-specific interfaces' JSON summaries stay plain text (they
// aren't natural-language markdown, rendering them as such wouldn't mean
// anything).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import HistorySection from './HistorySection';

describe('Generic chat history', () => {
  it('renders assistant markdown as real elements, not raw text', async () => {
    await browser.storage.local.set({
      history: [
        {
          id: 'h1',
          origin: 'https://example.com',
          timestamp: Date.now(),
          providerId: 'p1',
          providerLabel: 'My Anthropic',
          messages: [{ role: 'user', content: 'hi' }],
          outcome: {
            ok: true,
            message: '## Heading\n\n```js\nconsole.log(1);\n```',
          },
        },
      ],
    });

    render(<HistorySection />);

    expect(
      await screen.findByRole('heading', { name: 'Heading', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('console.log(1);').tagName).toBe('CODE');
    // Not rendered as literal markdown syntax.
    expect(screen.queryByText(/## Heading/)).not.toBeInTheDocument();
  });

  it('labels the prompt and response so their boundary is visible', async () => {
    await browser.storage.local.set({
      history: [
        {
          id: 'h1',
          origin: 'https://example.com',
          timestamp: Date.now(),
          providerId: 'p1',
          providerLabel: 'My Anthropic',
          messages: [{ role: 'user', content: 'hi' }],
          outcome: { ok: true, message: 'hello back' },
        },
      ],
    });

    render(<HistorySection />);

    expect(await screen.findByText('user:')).toBeInTheDocument();
    expect(screen.getByText('assistant:')).toBeInTheDocument();
  });

  it('labels a failed request as an error', async () => {
    await browser.storage.local.set({
      history: [
        {
          id: 'h1',
          origin: 'https://example.com',
          timestamp: Date.now(),
          providerId: 'p1',
          providerLabel: 'My Anthropic',
          messages: [{ role: 'user', content: 'hi' }],
          outcome: { ok: false, error: 'provider_error' },
        },
      ],
    });

    render(<HistorySection />);

    expect(await screen.findByText('error:')).toBeInTheDocument();
    expect(screen.getByText(/provider_error/)).toBeInTheDocument();
  });
});

describe('Anthropic Messages history', () => {
  it('keeps the JSON summary as plain text, not markdown', async () => {
    await browser.storage.local.set({
      'history:anthropicMessages': [
        {
          id: 'a1',
          origin: 'https://example.com',
          timestamp: Date.now(),
          providerId: 'p1',
          providerLabel: 'My Anthropic',
          requestSummary:
            '{"messages":[{"role":"user","content":"## not a heading"}]}',
          outcome: { ok: true, responseSummary: '{"id":"msg_1"}' },
        },
      ],
    });

    render(<HistorySection />);
    await userEvent.click(
      await screen.findByRole('tab', { name: 'Anthropic Messages' }),
    );

    expect(await screen.findByText(/"role":"user"/)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'not a heading' }),
    ).not.toBeInTheDocument();
  });
});
