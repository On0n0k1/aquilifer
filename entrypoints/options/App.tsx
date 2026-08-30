import HistorySection from './HistorySection';
import ProvidersSection from './ProvidersSection';
import RateLimitsSection from './RateLimitsSection';
import './style.css';

function App() {
  return (
    <main>
      <h1>Aquilifer settings</h1>
      <ProvidersSection />
      <RateLimitsSection />
      <HistorySection />
    </main>
  );
}

export default App;
