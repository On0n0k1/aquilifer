// Per-origin connection grants (SPEC §4). A grant binds an origin to a
// specific provider, chosen by the user at approval time — the website never
// picks or even sees which provider it's bound to.

export interface OriginGrants {
  [origin: string]: string; // providerId
}

const GRANTS_KEY = 'originGrants';

export async function loadOriginGrants(): Promise<OriginGrants> {
  const stored = await browser.storage.local.get(GRANTS_KEY);
  return (stored[GRANTS_KEY] as OriginGrants | undefined) ?? {};
}

export async function saveOriginGrants(grants: OriginGrants): Promise<void> {
  await browser.storage.local.set({ [GRANTS_KEY]: grants });
}
