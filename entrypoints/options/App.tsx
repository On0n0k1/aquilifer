import { useState } from 'react';
import ConnectedSitesSection from './ConnectedSitesSection';
import HistorySection from './HistorySection';
import ProvidersSection from './ProvidersSection';
import RateLimitsSection from './RateLimitsSection';
import './style.css';

type PageTab = 'providers' | 'connectedSites' | 'rateLimits' | 'history';

const TAB_LABELS: Record<PageTab, string> = {
  providers: 'Providers',
  connectedSites: 'Connected sites',
  rateLimits: 'Rate limiting',
  history: 'History',
};

function App() {
  const [tab, setTab] = useState<PageTab>('providers');

  return (
    <main>
      <h1>Aquilifer settings</h1>

      <div className="page-tab-bar" role="tablist">
        {(Object.keys(TAB_LABELS) as PageTab[]).map((key) => (
          <button
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
    </main>
  );
}

export default App;
