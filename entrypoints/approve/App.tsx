import { useEffect, useState } from 'react';
import {
  AQUILIFER_INTERNAL_KIND,
  type ResolveConnectMessage,
} from '../../lib/internal-protocol';
import {
  getDefaultProviderId,
  listProviders,
  type ProviderConfig,
  type ProviderType,
} from '../../lib/providers';

const SIGN_UP_LINKS: Partial<Record<ProviderType, string>> = {
  anthropic: 'https://console.anthropic.com/',
};

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    origin: params.get('origin') ?? '',
    requiredType: (params.get('requiredType') as ProviderType | null) ?? undefined,
    currentProviderLabel: params.get('currentProviderLabel') ?? undefined,
  };
}

function App() {
  const [{ origin, requiredType, currentProviderLabel }] = useState(getQueryParams);
  const [providers, setProviders] = useState<ProviderConfig[] | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    Promise.all([listProviders(), getDefaultProviderId()]).then(
      ([loadedProviders, defaultProviderId]) => {
        const matching = requiredType
          ? loadedProviders.filter((provider) => provider.type === requiredType)
          : loadedProviders;
        setProviders(matching);
        setSelectedProviderId(
          matching.find((provider) => provider.id === defaultProviderId)?.id ??
            matching[0]?.id ??
            '',
        );
      },
    );
  }, [requiredType]);

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
  const isSwitch = Boolean(requiredType);
  const signUpLink = requiredType ? SIGN_UP_LINKS[requiredType] : undefined;

  return (
    <main>
      <h1>{isSwitch ? 'Switch provider' : 'Connection request'}</h1>
      <p>
        <strong>{origin}</strong>{' '}
        {isSwitch ? (
          <>
            wants to switch{' '}
            {currentProviderLabel ? (
              <>
                from <strong>{currentProviderLabel}</strong>{' '}
              </>
            ) : null}
            to your {requiredType} provider.
          </>
        ) : (
          <>wants to connect to Aquilifer and send requests to an LLM.</>
        )}
      </p>

      {!loading && !hasProviders && (
        <p className="warning">
          {isSwitch
            ? `You don't have a ${requiredType} provider configured yet.`
            : 'No providers configured yet.'}{' '}
          {signUpLink ? (
            <a href={signUpLink} target="_blank" rel="noreferrer">
              Sign up
            </a>
          ) : (
            'Add one in settings'
          )}{' '}
          before approving.
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
