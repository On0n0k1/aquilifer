// @vitest-environment jsdom
// Component tier (SPEC §11) — the notifyOnBlock/showPopupOnBlock checkboxes
// aren't self-explanatory from their labels alone; a hover tooltip
// explains what each actually does.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RateLimitsSection from './RateLimitsSection';

describe('Block-notification checkboxes', () => {
  it('explain themselves via a hover tooltip', () => {
    render(<RateLimitsSection />);

    expect(screen.getByText('Turn on notification')).toHaveAttribute(
      'title',
      expect.stringContaining('browser notification'),
    );
    expect(screen.getByText('Show popup')).toHaveAttribute(
      'title',
      expect.stringContaining('popup window'),
    );
  });
});

describe('Block-alert cooldown', () => {
  it('explains itself via a hover tooltip and defaults to 15 seconds', () => {
    render(<RateLimitsSection />);

    const field = screen.getByText('Minimum seconds between block alerts');
    expect(field).toHaveAttribute(
      'title',
      expect.stringContaining("won't re-alert you"),
    );
    expect(
      screen.getByRole('spinbutton', {
        name: 'Minimum seconds between block alerts',
      }),
    ).toHaveValue(15);
  });
});
