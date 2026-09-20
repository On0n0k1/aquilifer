// @vitest-environment jsdom
// Component tier (SPEC §11) — the font-size/popup-width fields aren't
// self-explanatory from their labels alone (what exactly do they affect?),
// same reasoning as RateLimitsSection's own hover-tooltip test.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AppearanceSection from './AppearanceSection';

describe('Appearance defaults', () => {
  it('shows the un-scaled defaults before any preference is saved', () => {
    render(<AppearanceSection />);

    expect(
      screen.getByRole('slider', { name: 'Font size (100%)' }),
    ).toHaveValue('100');
    expect(
      screen.getByRole('slider', { name: 'Popup width (500px)' }),
    ).toHaveValue('500');
  });
});

describe('Appearance field tooltips', () => {
  it('explain what each field actually affects', () => {
    render(<AppearanceSection />);

    expect(screen.getByText('Font size (100%)')).toHaveAttribute(
      'title',
      expect.stringContaining('every piece of text'),
    );
    expect(screen.getByText('Popup width (500px)')).toHaveAttribute(
      'title',
      expect.stringContaining('toolbar popup'),
    );
  });
});

describe('Moving the font-size slider', () => {
  it('live-previews on the page immediately, without saving', async () => {
    render(<AppearanceSection />);

    const slider = screen.getByRole('slider', { name: 'Font size (100%)' });
    // Wait for the effect's own async getUiPreferences() load to settle
    // first — firing the change before it resolves risks the load
    // clobbering this edit right after, since both write the same state.
    await waitFor(() => expect(slider).toHaveValue('100'));
    fireEvent.change(slider, { target: { value: '130' } });

    expect(
      screen.getByRole('slider', { name: 'Font size (130%)' }),
    ).toBeInTheDocument();
    expect(
      document.documentElement.style.getPropertyValue('--font-scale'),
    ).toBe('1.3');

    // Not persisted until Save is actually clicked.
    const stored = await browser.storage.local.get('uiPreferences');
    expect(stored.uiPreferences).toBeUndefined();
  });
});

describe('Moving the popup width slider', () => {
  it('updates the preview box width immediately, without saving', async () => {
    render(<AppearanceSection />);

    const widthSlider = screen.getByRole('slider', {
      name: 'Popup width (500px)',
    });
    await waitFor(() => expect(widthSlider).toHaveValue('500'));
    fireEvent.change(widthSlider, { target: { value: '700' } });

    const preview = document.querySelector('.popup-size-preview');
    expect(preview).toHaveStyle({ width: '700px' });
    // Height was never set on the preview to begin with — it's content-
    // driven, same as the real popup, not a slider-controlled value.
    expect((preview as HTMLElement).style.height).toBe('');

    // Not persisted until Save is actually clicked.
    const stored = await browser.storage.local.get('uiPreferences');
    expect(stored.uiPreferences).toBeUndefined();
  });
});

describe('The popup preview', () => {
  it('shows one anthropic and one openai-compatible fake provider', () => {
    render(<AppearanceSection />);

    expect(screen.getByText('Personal Claude')).toBeInTheDocument();
    expect(screen.getByText('anthropic')).toBeInTheDocument();
    expect(screen.getByText('claude-opus-5')).toBeInTheDocument();

    expect(screen.getByText('Work OpenAI')).toBeInTheDocument();
    expect(screen.getByText('openai-compatible')).toBeInTheDocument();
    expect(screen.getByText('gpt-5')).toBeInTheDocument();
  });
});

describe('Saving appearance', () => {
  it('persists changed values and shows a confirmation', async () => {
    render(<AppearanceSection />);

    const fontSlider = screen.getByRole('slider', {
      name: 'Font size (100%)',
    });
    await waitFor(() => expect(fontSlider).toHaveValue('100'));
    fireEvent.change(fontSlider, { target: { value: '130' } });

    const widthSlider = screen.getByRole('slider', {
      name: 'Popup width (500px)',
    });
    fireEvent.change(widthSlider, { target: { value: '700' } });

    await userEvent.click(
      screen.getByRole('button', { name: 'Save appearance' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Saved' }),
    ).toBeInTheDocument();

    const stored = await browser.storage.local.get('uiPreferences');
    expect(stored.uiPreferences).toEqual({
      fontScale: 1.3,
      popupWidth: 700,
    });
  });
});
