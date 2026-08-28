import { useEffect, useState } from 'react';
import {
  AQUILIFER_INTERNAL_KIND,
  type ResolveConnectMessage,
} from '../../lib/internal-protocol';
import {
  getDefaultProviderId,
  listProviders,
  type ProviderConfig,
} from '../../lib/providers';

function getOriginFromQuery(): string {
  return new URLSearchParams(window.location.search).get('origin') ?? '';
}

function App() {
  const [origin] = useState(getOriginFromQuery);
  const [providers, setProviders] = useState<ProviderConfig[] | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    Promise.all([listProviders(), getDefaultProviderId()]).then(
      ([loadedProviders, defaultProviderId]) => {
        setProviders(loadedProviders);
        setSelectedProviderId(
          defaultProviderId ?? loadedProviders[0]?.id ?? '',
        );
      },
    );
  }, []);

  async function deny() {
    setResponded(true);
    const message: ResolveConnectMessage = {
      kind: AQUILIFER_INTERNAL_KIND,
      type: 'resolveConnect',
      origin,
      approve: false,
    };
    await browser.runtime.sendMessage(message);
    window.close();
  }

  async function approve() {
    if (!selectedProviderId) return;
    setResponded(true);
    const message: ResolveConnectMessage = {
      kind: AQUILIFER_INTERNAL_KIND,
      type: 'resolveConnect',
      origin,
      approve: true,
      providerId: selectedProviderId,
    };
    await browser.runtime.sendMessage(message);
    window.close();
  }

  const loading = providers === null;
  const hasProviders = (providers?.length ?? 0) > 0;

  return (
    <main>
      <h1>Connection request</h1>
      <p>
        <strong>{origin}</strong> wants to connect to Aquilifer and send
        requests to an LLM.
      </p>

      {!loading && !hasProviders && (
        <p className="warning">
          No providers configured yet. Add one in settings before approving.
        </p>
      )}

      {hasProviders && (
        <label>
          Use provider
          <select
            value={selectedProviderId}
            onChange={(event) => setSelectedProviderId(event.target.value)}
            disabled={responded}
          >
            {providers!.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="actions">
        <button onClick={deny} disabled={responded}>
          Deny
        </button>
        <button
          onClick={approve}
          disabled={responded || !hasProviders}
          autoFocus
        >
          Approve
        </button>
      </div>
    </main>
  );
}

export default App;
