import { type FormEvent, useEffect, useState } from 'react';
import { listModels, runChat } from '../../lib/llm-clients';
import {
  deleteProvider,
  getDefaultProviderId,
  listProviders,
  originPatternForUrl,
  type ProviderConfig,
  type ProviderType,
  saveProvider,
  setDefaultProviderId,
} from '../../lib/providers';
import {
  encryptApiKeyForStorage,
  isVaultConfigured,
  isVaultUnlocked,
} from '../../lib/vault';

const VERIFICATION_MESSAGE = 'Reply with only the word OK.';

interface FormState {
  type: ProviderType;
  label: string;
  apiKey: string;
  baseUrl: string;
  manualModel: string;
}

function emptyForm(): FormState {
  return {
    type: 'anthropic',
    label: '',
    apiKey: '',
    baseUrl: '',
    manualModel: '',
  };
}

function ProvidersSection() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [defaultProviderId, setDefaultProviderIdState] = useState<
    string | undefined
  >();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'saving'>('idle');
  // Set once automatic model discovery has failed for the current form
  // values — reveals the manual model field and switches Connect over to
  // the old real-chat-completion verification, the only way to confirm a
  // credential/URL works against a server that doesn't expose a model
  // listing endpoint (SPEC §3).
  const [discoveryFailed, setDiscoveryFailed] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(false);

  useEffect(() => {
    listProviders().then(setProviders);
    getDefaultProviderId().then(setDefaultProviderIdState);
    Promise.all([isVaultConfigured(), isVaultUnlocked()]).then(
      ([configured, unlocked]) => setVaultLocked(configured && !unlocked),
    );
  }, []);

  // Any change to what's being connected to invalidates a previous
  // discovery failure — retry discovery fresh rather than staying stuck
  // showing the manual fallback for now-different credentials.
  function updateForm(patch: Partial<FormState>) {
    setForm({ ...form, ...patch });
    setDiscoveryFailed(false);
  }

  async function handleSetDefault(id: string) {
    await setDefaultProviderId(id);
    setDefaultProviderIdState(id);
  }

  async function handleDelete(id: string) {
    await deleteProvider(id);
    setProviders(await listProviders());
    setDefaultProviderIdState(await getDefaultProviderId());
  }

  async function finishSaving(candidate: ProviderConfig) {
    setPhase('saving');
    if (candidate.apiKey) {
      candidate.apiKey = await encryptApiKeyForStorage(candidate.apiKey);
    }
    await saveProvider(candidate);

    setForm(emptyForm());
    setDiscoveryFailed(false);
    setProviders(await listProviders());
    setDefaultProviderIdState(await getDefaultProviderId());
  }

  async function handleConnect(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.label.trim()) {
      setError('Label is required.');
      return;
    }
    // Checked up front, before any network call below — failing only at
    // the final encrypt step would waste that call for nothing.
    if (vaultLocked) {
      setError('Vault is locked — unlock it from the Security tab first.');
      return;
    }
    if (form.type === 'anthropic' && !form.apiKey.trim()) {
      setError('API key is required.');
      return;
    }

    let originPattern: string | undefined;
    if (form.type === 'openai-compatible') {
      if (!form.baseUrl.trim()) {
        setError('Base URL is required.');
        return;
      }
      try {
        originPattern = originPatternForUrl(form.baseUrl.trim());
      } catch {
        setError('Enter a valid http(s) URL, e.g. http://localhost:8080');
        return;
      }
    }

    try {
      setPhase('connecting');

      if (originPattern) {
        // Must run inside this click handler's user gesture — the browser
        // ties permissions.request() to the transient activation from
        // Connect.
        const granted = await browser.permissions.request({
          origins: [originPattern],
        });
        if (!granted) {
          setError('Permission for that host was not granted.');
          return;
        }
      }

      const candidateBase =
        form.type === 'anthropic'
          ? {
              id: crypto.randomUUID(),
              type: 'anthropic' as const,
              label: form.label.trim(),
              apiKey: form.apiKey.trim(),
            }
          : {
              id: crypto.randomUUID(),
              type: 'openai-compatible' as const,
              label: form.label.trim(),
              baseUrl: form.baseUrl.trim(),
              apiKey: form.apiKey.trim() || undefined,
            };

      if (discoveryFailed) {
        // Fallback: no model-listing endpoint available — verify with a
        // real chat completion using the manually specified model, same
        // as the original flow.
        if (!form.manualModel.trim()) {
          setError('Model is required.');
          return;
        }
        const candidate: ProviderConfig = {
          ...candidateBase,
          model: form.manualModel.trim(),
        };
        try {
          const result = await runChat(candidate, {
            messages: [{ role: 'user', content: VERIFICATION_MESSAGE }],
          });
          candidate.resolvedModel = result.model;
        } catch (testError) {
          setError(
            `Connection test failed: ${
              testError instanceof Error ? testError.message : 'unknown error'
            }`,
          );
          return;
        }
        await finishSaving(candidate);
        return;
      }

      // Primary path: a successful model listing both discovers what's
      // available and proves the credential/URL work, so no separate test
      // chat is needed (SPEC §3). The first model returned becomes this
      // provider's model — changeable any time from the toolbar popup.
      let models: Awaited<ReturnType<typeof listModels>>;
      try {
        models = await listModels(candidateBase);
      } catch (discoverError) {
        setDiscoveryFailed(true);
        setError(
          `Couldn't automatically list available models (${
            discoverError instanceof Error
              ? discoverError.message
              : 'unknown error'
          }). Specify one manually below.`,
        );
        return;
      }
      if (models.length === 0) {
        setDiscoveryFailed(true);
        setError('The server returned no models. Specify one manually below.');
        return;
      }

      // Verified non-empty just above; TS can't see that invariant through
      // the array index.
      await finishSaving({ ...candidateBase, model: models[0]!.id });
    } finally {
      setPhase('idle');
    }
  }

  return (
    <>
      <section>
        <h2>Providers</h2>
        {providers.length === 0 && <p>No providers configured yet.</p>}
        <ul className="provider-list">
          {providers.map((provider) => {
            const isDefault = provider.id === defaultProviderId;
            return (
              <li key={provider.id}>
                <div className="provider-row-top">
                  <div className="provider-row-main">
                    <div className="provider-row-col provider-row-col-name">
                      <strong>{provider.label}</strong>
                    </div>
                    <div className="provider-row-col">
                      <span className="provider-type">{provider.type}</span>
                    </div>
                    <div className="provider-row-col">
                      {isDefault ? (
                        <span className="provider-default">Default</span>
                      ) : (
                        <button
                          type="button"
                          className="set-default-button"
                          onClick={() => handleSetDefault(provider.id)}
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="provider-actions">
                    <button
                      type="button"
                      className="provider-remove-button"
                      aria-label="Remove provider"
                      title="Remove"
                      onClick={() => handleDelete(provider.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="provider-detail">
                  {provider.type === 'openai-compatible'
                    ? `${provider.baseUrl} (${provider.resolvedModel ?? provider.model})`
                    : (provider.resolvedModel ?? provider.model)}
                </div>
              </li>
            );
          })}
        </ul>
        {providers.length > 0 && (
          <p className="provider-detail">
            Pick which model each provider uses from the toolbar popup.
          </p>
        )}
      </section>

      <section>
        <h2>Add provider</h2>
        {vaultLocked && (
          <p className="error">
            The vault is locked. Unlock it from the Security tab to add or
            change providers.
          </p>
        )}
        <form onSubmit={handleConnect}>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                updateForm({ type: event.target.value as ProviderType })
              }
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai-compatible">
                OpenAI-compatible (local/self-hosted)
              </option>
            </select>
          </label>

          <label>
            Label
            <input
              value={form.label}
              onChange={(event) => updateForm({ label: event.target.value })}
              placeholder="e.g. Claude home"
            />
          </label>

          {form.type === 'anthropic' ? (
            <label>
              API key
              <input
                type="password"
                value={form.apiKey}
                onChange={(event) => updateForm({ apiKey: event.target.value })}
              />
            </label>
          ) : (
            <>
              <label>
                Base URL
                <input
                  value={form.baseUrl}
                  onChange={(event) =>
                    updateForm({ baseUrl: event.target.value })
                  }
                  placeholder="http://localhost:8080"
                />
              </label>
              <label>
                API key (optional)
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) =>
                    updateForm({ apiKey: event.target.value })
                  }
                />
              </label>
            </>
          )}

          {discoveryFailed && (
            <label>
              Model
              <input
                value={form.manualModel}
                onChange={(event) =>
                  setForm({ ...form, manualModel: event.target.value })
                }
                placeholder={
                  form.type === 'anthropic'
                    ? 'e.g. claude-opus-4-5'
                    : 'e.g. llama-3'
                }
              />
            </label>
          )}

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={phase !== 'idle' || vaultLocked}>
            {phase === 'connecting'
              ? 'Connecting…'
              : phase === 'saving'
                ? 'Saving…'
                : 'Connect'}
          </button>
        </form>
      </section>
    </>
  );
}

export default ProvidersSection;
