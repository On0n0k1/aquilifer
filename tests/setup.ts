// Runs before every test file (SPEC §11). WXT's own WxtVitest plugin already
// stubs the global browser/chrome with fakeBrowser, but only once per file —
// this resets its in-memory state before each individual test so tests in
// the same file can't leak storage/state into one another.

import { afterEach, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

// Extends vitest's `expect` with DOM matchers (toBeInTheDocument, etc.) for
// the component tier — a no-op import for plain lib/ unit tests, so it's
// fine to load unconditionally here rather than per component test file.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  fakeBrowser.reset();
});

// React Testing Library's own auto-cleanup only registers itself when
// `afterEach` is a *global* (works out of the box under Jest, or vitest with
// `test.globals: true`) — this project imports vitest's test functions
// explicitly instead, so cleanup has to be wired up by hand here or DOM from
// one component test leaks into the next.
afterEach(() => {
  cleanup();
});
