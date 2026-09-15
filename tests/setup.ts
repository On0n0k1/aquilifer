// Runs before every test file (SPEC §11). WXT's own WxtVitest plugin already
// stubs the global browser/chrome with fakeBrowser, but only once per file —
// this resets its in-memory state before each individual test so tests in
// the same file can't leak storage/state into one another.
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach } from 'vitest';

beforeEach(() => {
  fakeBrowser.reset();
});
