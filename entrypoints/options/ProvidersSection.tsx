import { type FormEvent, useEffect, useState } from 'react';
import { runChat } from '../../lib/llm-clients';
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

interface ModelVersion {
  id: string;
  label: string;
}

// Current as of this writing — Anthropic ships new versions over time, so
// this list needs occasional manual updates; "Other" always covers the gap.
const ANTHROPIC_MODEL_FAMILIES: Record<string, ModelVersion[]> = {
  Opus: [
    { id: 'claude-opus-5', label: 'Opus 5' },
    { id: 'claude-opus-4-8', label: 'Opus 4.8' },
    { id: 'claude-opus-4-7', label: 'Opus 4.7' },
    { id: 'claude-opus-4-6', label: 'Opus 4.6' },
  ],
  Sonnet: [
    { id: 'claude-sonnet-5', label: 'Sonnet 5' },
    { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  ],
  Haiku: [{ id: 'claude-haiku-4-5', label: 'Haiku 4.5' }],
  Fable: [{ id: 'claude-fable-5', label: 'Fable 5' }],
};
const OTHER_MODEL = '__other__';

interface FormState {
  type: ProviderType;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

function emptyForm(): FormState {
  return { type: 'anthropic', label: '', apiKey: '', baseUrl: '', model: '' };
}

function ProvidersSection() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [defaultProviderId, setDefaultProviderIdState] = useState<
    string | undefined
  >();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'testing' | 'saving'>('idle');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [modelFamily, setModelFamily] = useState('');
  const [vaultLocked, setVaultLocked] = useState(false);

  useEffect(() => {
    listProviders().then(setProviders);
    getDefaultProviderId().then(setDefaultProviderIdState);
    Promise.all([isVaultConfigured(), isVaultUnlocked()]).then(
      ([configured, unlocked]) => setVaultLocked(configured && !unlocked),
    );
  }, []);

  async function handleSetDefault(id: string) {
    await setDefaultProviderId(id);
    setDefaultProviderIdState(id);
  }

  async function handleDelete(id: string) {
    await deleteProvider(id);
    setProviders(await listProviders());
    setDefaultProviderIdState(await getDefaultProviderId());
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.label.trim()) {
      setError('Label is required.');
      return;
    }

    // Checked up front, before the verification call below spends a real
    // request against the provider — failing only at the final encrypt
    // step would waste that call for nothing.
    if (vaultLocked) {
      setError('Vault is locked — unlock it from the Security tab first.');
      return;
    }

    try {
      let candidate: ProviderConfig;

      if (form.type === 'anthropic') {
        if (!form.apiKey.trim() || !form.model.trim()) {
          setError('API key and model are required.');
          return;
        }
        candidate = {
          id: crypto.randomUUID(),
          type: 'anthropic',
          label: form.label.trim(),
          apiKey: form.apiKey.trim(),
          model: form.model.trim(),
        };
      } else {
        if (!form.baseUrl.trim() || !form.model.trim()) {
          setError('Base URL and model are required.');
          return;
        }

        let originPattern: string;
        try {
          originPattern = originPatternForUrl(form.baseUrl.trim());
        } catch {
          setError('Enter a valid http(s) URL, e.g. http://localhost:8080');
          return;
        }

        setPhase('saving');
        // Must run inside this click handler's user gesture — the browser
        // ties permissions.request() to the transient activation from Save.
        const granted = await browser.permissions.request({
          origins: [originPattern],
        });
        if (!granted) {
          setError('Permission for that host was not granted.');
          return;
        }

        candidate = {
          id: crypto.randomUUID(),
          type: 'openai-compatible',
          label: form.label.trim(),
          baseUrl: form.baseUrl.trim(),
          apiKey: form.apiKey.trim() || undefined,
          model: form.model.trim(),
        };
      }

      // A provider is only ever persisted once a real chat call against it
      // succeeds — this both proves the credential/URL work and gives us
      // the model name/version the provider itself reports, which is what
      // getProvider (once built) will expose to websites, never `label`.
      setPhase('testing');
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

      setPhase('saving');
      if (candidate.apiKey) {
        candidate.apiKey = await encryptApiKeyForStorage(candidate.apiKey);
      }
      await saveProvider(candidate);

      setForm(emptyForm());
      setUseCustomModel(false);
      setModelFamily('');
      setProviders(await listProviders());
      setDefaultProviderIdState(await getDefaultProviderId());
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
                <div>
                  <strong>{provider.label}</strong>
                  <span className="provider-type">{provider.type}</span>
                  {isDefault && (
                    <span className="provider-default">default</span>
                  )}
                  <div className="provider-detail">
                    {provider.type === 'openai-compatible'
                      ? `${provider.baseUrl} (${provider.resolvedModel ?? provider.model})`
                      : (provider.resolvedModel ?? provider.model)}
                  </div>
                </div>
                <div className="provider-actions">
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(provider.id)}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(provider.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>Add provider</h2>
        {vaultLocked && (
          <p className="error">
            The vault is locked. Unlock it from the Security tab to add or
            change providers.
          </p>
        )}
        <form onSubmit={handleSave}>
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as ProviderType })
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
              onChange={(event) =>
                setForm({ ...form, label: event.target.value })
              }
              placeholder="e.g. Claude home"
            />
          </label>

          {form.type === 'anthropic' ? (
            <>
              <label>
                Model family
                <select
                  value={useCustomModel ? OTHER_MODEL : modelFamily}
                  onChange={(event) => {
                    const value = event.target.value;
                    const defaultVersion = ANTHROPIC_MODEL_FAMILIES[value]?.[0];
                    if (value === OTHER_MODEL || !defaultVersion) {
                      setUseCustomModel(true);
                      setModelFamily('');
                      setForm({ ...form, model: '' });
                    } else {
                      setUseCustomModel(false);
                      setModelFamily(value);
                      // Default to that family's newest version.
                      setForm({ ...form, model: defaultVersion.id });
                    }
                  }}
                >
                  <option value="" disabled>
                    Select a family
                  </option>
                  {Object.keys(ANTHROPIC_MODEL_FAMILIES).map((family) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
                  <option value={OTHER_MODEL}>Other (enter manually)</option>
                </select>
              </label>
              {!useCustomModel && modelFamily && (
                <label>
                  Version
                  <select
                    value={form.model}
                    onChange={(event) =>
                      setForm({ ...form, model: event.target.value })
                    }
                  >
                    {(ANTHROPIC_MODEL_FAMILIES[modelFamily] ?? []).map(
                      (version) => (
                        <option key={version.id} value={version.id}>
                          {version.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}
              {useCustomModel && (
                <label>
                  Custom model ID
                  <input
                    value={form.model}
                    onChange={(event) =>
                      setForm({ ...form, model: event.target.value })
                    }
                    placeholder="e.g. claude-opus-4-5"
                  />
                </label>
              )}
              <label>
                API key
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) =>
                    setForm({ ...form, apiKey: event.target.value })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Base URL
                <input
                  value={form.baseUrl}
                  onChange={(event) =>
                    setForm({ ...form, baseUrl: event.target.value })
                  }
                  placeholder="http://localhost:8080"
                />
              </label>
              <label>
                Model
                <input
                  value={form.model}
                  onChange={(event) =>
                    setForm({ ...form, model: event.target.value })
                  }
                  placeholder="e.g. llama-3"
                />
              </label>
              <label>
                API key (optional)
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(event) =>
                    setForm({ ...form, apiKey: event.target.value })
                  }
                />
              </label>
            </>
          )}

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={phase !== 'idle' || vaultLocked}>
            {phase === 'testing'
              ? 'Testing connection…'
              : phase === 'saving'
                ? 'Saving…'
                : 'Save provider'}
          </button>
        </form>
      </section>
    </>
  );
}

export default ProvidersSection;
