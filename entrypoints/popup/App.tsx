import { useCallback, useEffect, useState } from 'react';
import aquiliferLogo from '/aquila.png';
import { AQUILIFER_ERRORS } from '../../lib/errors';
import { AQUILIFER_INTERNAL_KIND } from '../../lib/internal-protocol';
import { listModels, type ModelInfo } from '../../lib/llm-clients';
import { loadOriginGrants } from '../../lib/permissions';
import {
  getDefaultProviderId,
  listProviders,
  type ProviderConfig,
  saveProvider,
  setDefaultProviderId,
} from '../../lib/providers';
import {
  computeOriginRateLimitStatus,
  type OriginRateLimitStatus,
} from '../../lib/rate-limits';
import { resolveApiKey } from '../../lib/vault';
import './App.css';

// The popup is short-lived (open only while the user is looking at it), so
// a short poll for "what's in flight right now" is simpler than a new push
// channel from background — decided over a live broadcast (SPEC — visual
// design) specifically because there's no long-lived state to keep in sync.
const ACTIVE_REQUEST_POLL_MS = 1000;

// Oxblood red is a sparing accent only (SPEC §15) — the rate bar stays gold
// until a site is genuinely close to being blocked, not proportionally
// blended from the start.
const NEAR_LIMIT_PERCENT = 80;

function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

interface WorstTier {
  count: number;
  threshold: number;
  percent: number;
}

/**
 * Rate limits are two-tiered (global + per-interface, lib/rate-limits.ts) —
 * a site can be close to blocked on a tight per-interface window while its
 * global count looks fine. Headlining whichever tier is closest to blocking
 * is the only single number that honestly answers "how close is this site
 * to being rate-limited," since that's exactly what would trigger a block.
 */
function worstTier(status: OriginRateLimitStatus): WorstTier {
  const tiers = [status.global, ...Object.values(status.perInterface)];
  return tiers
    .map((tier) => ({
      count: tier.count,
      threshold: tier.threshold,
      percent: tier.threshold > 0 ? (tier.count / tier.threshold) * 100 : 0,
    }))
    .reduce((worst, current) =>
      current.percent > worst.percent ? current : worst,
    );
}

interface ModelPickerState {
  status: 'loading' | 'ready' | 'error';
  models?: ModelInfo[];
  error?: string;
}

function App() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [defaultProviderId, setDefaultProviderIdState] = useState<
    string | undefined
  >();
  const [siteOrigin, setSiteOrigin] = useState<string | undefined>();
  const [siteProviderId, setSiteProviderId] = useState<string | undefined>();
  const [siteStatus, setSiteStatus] = useState<OriginRateLimitStatus | null>(
    null,
  );
  const [activeProviderIds, setActiveProviderIds] = useState<Set<string>>(
    new Set(),
  );
  const [pickers, setPickers] = useState<Record<string, ModelPickerState>>({});

  useEffect(() => {
    listProviders().then(setProviders);
    getDefaultProviderId().then(setDefaultProviderIdState);

    // activeTab (wxt.config.ts) grants access to this tab's URL only
    // because opening the popup is itself the qualifying user gesture —
    // never any other tab, and no broader `tabs` permission needed.
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(async ([tab]) => {
        const origin = originOf(tab?.url);
        if (!origin) return;
        setSiteOrigin(origin);

        const grants = await loadOriginGrants();
        const providerId = grants[origin];
        if (!providerId) return;

        setSiteProviderId(providerId);
        setSiteStatus(await computeOriginRateLimitStatus(origin));
      });
  }, []);

  const pollActiveRequests = useCallback(async () => {
    try {
      const response = (await browser.runtime.sendMessage({
        kind: AQUILIFER_INTERNAL_KIND,
        type: 'getActiveRequests',
      })) as { activeProviderIds: string[] } | undefined;
      setActiveProviderIds(new Set(response?.activeProviderIds ?? []));
    } catch {
      // Background unreachable (e.g. service worker mid-restart) — leave
      // the last known state rather than crash; the next poll retries.
    }
  }, []);

  useEffect(() => {
    pollActiveRequests();
    const interval = setInterval(pollActiveRequests, ACTIVE_REQUEST_POLL_MS);
    return () => clearInterval(interval);
  }, [pollActiveRequests]);

  function openOptions() {
    browser.runtime.openOptionsPage();
  }

  async function openModelPicker(provider: ProviderConfig) {
    setPickers((prev) => ({ ...prev, [provider.id]: { status: 'loading' } }));
    try {
      const apiKey = provider.apiKey
        ? await resolveApiKey(provider.apiKey)
        : undefined;
      const models = await listModels(
        provider.type === 'anthropic'
          ? { type: 'anthropic', apiKey: apiKey ?? '' }
          : { type: 'openai-compatible', baseUrl: provider.baseUrl, apiKey },
      );
      setPickers((prev) => ({
        ...prev,
        [provider.id]: { status: 'ready', models },
      }));
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message === AQUILIFER_ERRORS.VAULT_LOCKED
          ? 'Unlock the vault (Security tab in Options) to change the model.'
          : error instanceof Error
            ? error.message
            : 'unknown error';
      setPickers((prev) => ({
        ...prev,
        [provider.id]: { status: 'error', error: message },
      }));
    }
  }

  async function handleSelectModel(provider: ProviderConfig, model: string) {
    await saveProvider({ ...provider, model, resolvedModel: undefined });
    setProviders(await listProviders());
    closeModelPicker(provider.id);
  }

  function closeModelPicker(providerId: string) {
    setPickers((prev) => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
  }

  async function handleSetDefault(id: string) {
    await setDefaultProviderId(id);
    setDefaultProviderIdState(id);
  }

  /** Revokes the current site's connection — the next request it makes
   *  goes through the connect/approve flow again from scratch, same as
   *  Options' own Connected sites tab, just scoped to whichever tab the
   *  popup was opened on. */
  async function handleDisconnectSite() {
    if (!siteOrigin) return;
    await browser.runtime.sendMessage({
      kind: AQUILIFER_INTERNAL_KIND,
      type: 'revokeOrigin',
      origin: siteOrigin,
    });
    setSiteProviderId(undefined);
    setSiteStatus(null);
  }

  const siteProvider = providers.find((p) => p.id === siteProviderId);
  const worst = siteStatus ? worstTier(siteStatus) : null;

  return (
    <>
      <header className="popup-header">
        <img src={aquiliferLogo} className="logo" alt="" />
        <h1>Aquilifer</h1>
      </header>

      {providers.length === 0 ? (
        <div className="empty-state">
          <p>No providers configured yet.</p>
          <button type="button" onClick={openOptions}>
            Add a provider
          </button>
        </div>
      ) : (
        <>
          <section className="current-site">
            {siteProvider && worst ? (
              <>
                <p className="current-site-label">
                  This site is connected to{' '}
                  <strong>{siteProvider.label}</strong>
                </p>
                <div
                  className="rate-bar"
                  title={`${worst.count} / ${worst.threshold} requests in the current window`}
                >
                  <div
                    className={`rate-bar-fill${worst.percent >= NEAR_LIMIT_PERCENT ? ' near-limit' : ''}`}
                    style={{ width: `${Math.min(worst.percent, 100)}%` }}
                  />
                </div>
                <p className="rate-bar-label">
                  {worst.count} / {worst.threshold} requests in the current
                  window
                </p>
                <div className="current-site-actions">
                  <button type="button" onClick={handleDisconnectSite}>
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <p className="current-site-label">
                This site isn't connected to a provider.
              </p>
            )}
          </section>

          <ul className="provider-list">
            {providers.map((provider) => {
              const picker = pickers[provider.id];
              return (
                <li key={provider.id}>
                  <div className="provider-row-main">
                    <strong>{provider.label}</strong>
                    <span className="provider-type">{provider.type}</span>
                    {provider.id === siteProviderId && (
                      <span className="provider-current-site">this site</span>
                    )}
                    {provider.id === defaultProviderId && (
                      <span className="provider-default">default</span>
                    )}
                    {activeProviderIds.has(provider.id) && (
                      <span
                        className="in-use-spinner"
                        role="img"
                        aria-label="In use right now"
                        title="In use right now"
                      >
                        ⚙
                      </span>
                    )}
                  </div>
                  <div className="provider-detail">{provider.model}</div>
                  <div className="provider-row-actions">
                    {provider.id !== defaultProviderId && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(provider.id)}
                      >
                        Set default
                      </button>
                    )}
                    {picker?.status === 'ready' ? (
                      <>
                        <select
                          value={provider.model}
                          onChange={(event) =>
                            handleSelectModel(provider, event.target.value)
                          }
                        >
                          {picker.models?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="model-picker-cancel"
                          aria-label="Cancel changing model"
                          title="Cancel"
                          onClick={() => closeModelPicker(provider.id)}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openModelPicker(provider)}
                        disabled={picker?.status === 'loading'}
                      >
                        {picker?.status === 'loading'
                          ? 'Loading…'
                          : 'Change model'}
                      </button>
                    )}
                  </div>
                  {picker?.status === 'error' && (
                    <p className="model-picker-error">{picker.error}</p>
                  )}
                </li>
              );
            })}
          </ul>

          <button type="button" className="options-link" onClick={openOptions}>
            Manage providers
          </button>
        </>
      )}
    </>
  );
}

export default App;
