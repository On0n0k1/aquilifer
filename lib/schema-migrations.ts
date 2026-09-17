// Storage schema migrations (SPEC §16, §18) — an MV3 extension updates in
// place on top of whatever's already in chrome.storage.local, so a future
// release that changes a stored shape needs a way to transform old data
// into the new shape rather than silently misreading it. Nothing has ever
// needed a real migration yet (every stored-shape change so far has been
// additive/optional), so `MIGRATIONS` is empty today — this is the
// machinery, ready for whenever that changes.

const SCHEMA_VERSION_KEY = 'schemaVersion';

/** Bump this whenever a stored shape changes in a way existing data can't
 *  already tolerate (adding an optional field doesn't count — only a
 *  change that would make old data get misread needs a migration entry
 *  below). */
export const CURRENT_SCHEMA_VERSION = 1;

/** version -> the function that migrates FROM that version TO version+1.
 *  Empty today; add entries here as breaking storage changes happen. */
export const MIGRATIONS: Record<number, () => Promise<void>> = {};

// A real prior install always has at least one of these, since they're
// written the moment someone actually uses the extension (adds a
// provider, connects a site) — used to tell "genuinely fresh install,
// nothing to migrate" apart from "predates schemaVersion tracking, has
// real data at the implicit baseline shape" when schemaVersion is unset.
const LEGACY_PRESENCE_KEYS = ['providers', 'originGrants'] as const;

async function hasLegacyData(): Promise<boolean> {
  const stored = await browser.storage.local.get([...LEGACY_PRESENCE_KEYS]);
  return LEGACY_PRESENCE_KEYS.some((key) => stored[key] !== undefined);
}

/**
 * Applies every migration needed to bring data from `fromVersion` up to
 * `targetVersion`, persisting progress after each individual step — if
 * one throws partway through a multi-step chain, the next attempt resumes
 * from there instead of re-running already-applied migrations and risking
 * a double transform.
 *
 * A user can be several schema versions behind at once (an MV3 extension
 * only ever applies the latest available release, not each intermediate
 * one), so this is a loop, not a single old-shape-to-new-shape function.
 */
export async function runMigrationSequence(
  migrations: Record<number, () => Promise<void>>,
  targetVersion: number,
  fromVersion: number,
): Promise<void> {
  let version = fromVersion;

  // version > targetVersion is only reachable via a dev-only downgrade
  // (loading an older unpacked build over newer data) — Chrome's own
  // update model never produces this. Migrations aren't reversible in
  // general, so the safe move is to leave stored data untouched rather
  // than guess a reverse transform.
  if (version >= targetVersion) return;

  while (version < targetVersion) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new Error(`Missing migration from schema version ${version}.`);
    }
    await migrate();
    version += 1;
    await browser.storage.local.set({ [SCHEMA_VERSION_KEY]: version });
  }
}

/**
 * The real entry point — awaited once at module load in the background
 * service worker (the same pattern `originGrantsLoaded` already uses),
 * not gated on `browser.runtime.onInstalled`. That event only fires on an
 * actual install/update, never on the far more common ordinary
 * service-worker restart, so gating on it directly would leave anything
 * awaiting this hanging forever on a plain restart. Safe to run on every
 * startup regardless: once already current, it's a single storage read.
 */
export async function runMigrations(): Promise<void> {
  const stored = await browser.storage.local.get(SCHEMA_VERSION_KEY);
  const storedVersion = stored[SCHEMA_VERSION_KEY] as number | undefined;

  if (storedVersion === undefined) {
    if (!(await hasLegacyData())) {
      // Genuinely fresh install — nothing to migrate. Stamp the current
      // version directly rather than running the migration loop, since a
      // migration step is allowed to assume real prior data exists.
      await browser.storage.local.set({
        [SCHEMA_VERSION_KEY]: CURRENT_SCHEMA_VERSION,
      });
      return;
    }

    // Pre-existing data from before schemaVersion tracking existed — it
    // sits at the implicit baseline shape (version 1). Stamp that before
    // the loop below, not just after: if 1 is already CURRENT_SCHEMA_VERSION
    // the loop is a no-op, and without this write the key would never get
    // set at all, leaving this branch re-triggered forever.
    await browser.storage.local.set({ [SCHEMA_VERSION_KEY]: 1 });
  }

  await runMigrationSequence(
    MIGRATIONS,
    CURRENT_SCHEMA_VERSION,
    storedVersion ?? 1,
  );
}
