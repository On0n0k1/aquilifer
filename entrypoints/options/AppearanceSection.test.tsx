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
      screen.getByRole('spinbutton', { name: 'Popup width (pixels)' }),
    ).toHaveValue(500);
  });
});

describe('Appearance field tooltips', () => {
  it('explain what each field actually affects', () => {
    render(<AppearanceSection />);

    expect(screen.getByText('Font size (100%)')).toHaveAttribute(
      'title',
      expect.stringContaining('every piece of text'),
    );
    expect(screen.getByText('Popup width (pixels)')).toHaveAttribute(
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

describe('Saving appearance', () => {
  it('persists changed values and shows a confirmation', async () => {
    render(<AppearanceSection />);

    const slider = screen.getByRole('slider', { name: 'Font size (100%)' });
    await waitFor(() => expect(slider).toHaveValue('100'));
    fireEvent.change(slider, { target: { value: '130' } });

    await userEvent.click(
      screen.getByRole('button', { name: 'Save appearance' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Saved' }),
    ).toBeInTheDocument();

    const stored = await browser.storage.local.get('uiPreferences');
    expect(stored.uiPreferences).toEqual({ fontScale: 1.3, popupWidth: 500 });
  });
});
