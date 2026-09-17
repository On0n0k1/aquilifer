import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  runMigrationSequence,
  runMigrations,
} from './schema-migrations';

describe('runMigrations on a genuinely fresh install', () => {
  it('stamps the current version directly, without running any migration', async () => {
    await runMigrations();

    const stored = await browser.storage.local.get('schemaVersion');
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('runMigrations on pre-existing data with no schemaVersion recorded', () => {
  it('treats it as baseline version 1 and runs migrations from there', async () => {
    await browser.storage.local.set({ providers: [] });

    await runMigrations();

    const stored = await browser.storage.local.get('schemaVersion');
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('also recognizes originGrants alone as legacy data', async () => {
    await browser.storage.local.set({ originGrants: {} });

    await runMigrations();

    const stored = await browser.storage.local.get('schemaVersion');
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('runMigrations when already at the current version', () => {
  it('is a no-op', async () => {
    await browser.storage.local.set({ schemaVersion: CURRENT_SCHEMA_VERSION });

    await runMigrations();

    const stored = await browser.storage.local.get('schemaVersion');
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('runMigrationSequence', () => {
  it('applies a chain of migrations in order and persists progress after each step', async () => {
    const applied: number[] = [];
    const migrations = {
      1: async () => {
        applied.push(1);
      },
      2: async () => {
        applied.push(2);
      },
      3: async () => {
        applied.push(3);
      },
    };

    await runMigrationSequence(migrations, 4, 1);

    expect(applied).toEqual([1, 2, 3]);
    const stored = await browser.storage.local.get('schemaVersion');
    expect(stored.schemaVersion).toBe(4);
  });

  it('does not lose already-applied progress when a later step throws', async () => {
    const applied: number[] = [];
    const migrations = {
      1: async () => {
        applied.push(1);
      },
      2: async () => {
        throw new Error('boom');
      },
    };

    await expect(runMigrationSequence(migrations, 3, 1)).rejects.toThrow(
      'boom',
    );

    expect(applied).toEqual([1]);
    const stored = await browser.storage.local.get('schemaVersion');
    expect(stored.schemaVersion).toBe(2);
  });

  it('throws if a migration for an intermediate version is missing', async () => {
    await expect(runMigrationSequence({}, 2, 1)).rejects.toThrow(
      'Missing migration from schema version 1.',
    );
  });

  it('is a safe no-op when already at or past the target version (dev-only downgrade case)', async () => {
    const migrations = {
      5: async () => {
        throw new Error('should never run');
      },
    };

    await expect(
      runMigrationSequence(migrations, 3, 5),
    ).resolves.toBeUndefined();

    const stored = await browser.storage.local.get('schemaVersion');
    expect(stored.schemaVersion).toBeUndefined();
  });
});
