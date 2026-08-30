import { useEffect, useState } from 'react';
import { clearHistory, listHistory, type HistoryEntry } from '../../lib/history';

const WARNING_LABELS: Record<string, string> = {
  large_request: 'large request',
  rate_limited: 'rate limited',
};

function HistorySection() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    listHistory().then(setHistory);
  }, []);

  async function handleClearHistory() {
    await clearHistory();
    setHistory(await listHistory());
  }

  return (
    <section>
      <div className="section-header">
        <h2>History</h2>
        {history.length > 0 && (
          <button onClick={handleClearHistory}>Clear all</button>
        )}
      </div>
      {history.length === 0 && <p>No requests yet.</p>}
      <ul className="history-list">
        {[...history]
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((entry) => {
            const lastMessage = entry.messages[entry.messages.length - 1];
            return (
              <li key={entry.id}>
                <div className="history-meta">
                  <strong>{entry.origin}</strong>
                  <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  <span>{entry.providerLabel}</span>
                </div>
                {entry.warnings && entry.warnings.length > 0 && (
                  <div className="history-warnings">
                    {entry.warnings.map((warning) => (
                      <span key={warning} className="warning-tag">
                        ⚠ {WARNING_LABELS[warning] ?? warning}
                      </span>
                    ))}
                  </div>
                )}
                {lastMessage && (
                  <div className="history-prompt">
                    {lastMessage.role}: {lastMessage.content}
                  </div>
                )}
                <div
                  className={
                    entry.outcome.ok ? 'history-result' : 'history-error'
                  }
                >
                  {entry.outcome.ok
                    ? entry.outcome.message
                    : entry.outcome.error}
                </div>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

export default HistorySection;
