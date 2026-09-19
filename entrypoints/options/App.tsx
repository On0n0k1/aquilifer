import { useState } from 'react';
import ConnectedSitesSection from './ConnectedSitesSection';
import HistorySection from './HistorySection';
import ProvidersSection from './ProvidersSection';
import RateLimitsSection from './RateLimitsSection';
import SecuritySection from './SecuritySection';
import './style.css';

type PageTab =
  | 'providers'
  | 'connectedSites'
  | 'rateLimits'
  | 'history'
  | 'security';

const TAB_LABELS: Record<PageTab, string> = {
  providers: 'Providers',
  connectedSites: 'Connected sites',
  rateLimits: 'Rate limiting',
  history: 'History',
  security: 'Security',
};

function App() {
  const [tab, setTab] = useState<PageTab>('providers');

  return (
    <main className={tab === 'history' ? 'wide' : undefined}>
      <h1>Aquilifer settings</h1>

      <div className="page-tab-bar" role="tablist">
        {(Object.keys(TAB_LABELS) as PageTab[]).map((key) => (
          <button
            type="button"
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'page-tab active' : 'page-tab'}
            onClick={() => setTab(key)}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {tab === 'providers' && <ProvidersSection />}
      {tab === 'connectedSites' && <ConnectedSitesSection />}
      {tab === 'rateLimits' && <RateLimitsSection />}
      {tab === 'history' && <HistorySection />}
      {tab === 'security' && <SecuritySection />}
    </main>
  );
}

export default App;
