import { useEffect, useState } from 'react';
import { AQUILIFER_INTERNAL_KIND } from '../../lib/internal-protocol';
import { loadOriginGrants, type OriginGrants } from '../../lib/permissions';
import { listProviders, type ProviderConfig } from '../../lib/providers';

function ConnectedSitesSection() {
  const [grants, setGrants] = useState<OriginGrants>({});
  const [providers, setProviders] = useState<ProviderConfig[]>([]);

  async function refresh() {
    setGrants(await loadOriginGrants());
    setProviders(await listProviders());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDisconnect(origin: string) {
    await browser.runtime.sendMessage({
      kind: AQUILIFER_INTERNAL_KIND,
      type: 'revokeOrigin',
      origin,
    });
    await refresh();
  }

  const origins = Object.entries(grants);

  return (
    <section>
      <h2>Connected sites</h2>
      {origins.length === 0 && <p>No sites are connected.</p>}
      <ul className="provider-list">
        {origins.map(([origin, providerId]) => {
          const provider = providers.find((p) => p.id === providerId);
          return (
            <li key={origin}>
              <div>
                <strong>{origin}</strong>
                <div className="provider-detail">
                  {provider ? provider.label : 'provider no longer exists'}
                </div>
              </div>
              <button onClick={() => handleDisconnect(origin)}>
                Disconnect
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ConnectedSitesSection;
