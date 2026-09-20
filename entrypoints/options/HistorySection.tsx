import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as anthropicMessagesHistory from '../../lib/history/anthropic-messages';
import {
  clearHistory as clearGenericHistory,
  type HistoryEntry,
  listHistory as listGenericHistory,
} from '../../lib/history/generic';
import * as openaiChatCompletionsHistory from '../../lib/history/openai-chat-completions';
import {
  getHistoryCardTheme,
  type HistoryCardTheme,
  setHistoryCardTheme,
} from '../../lib/history-display-prefs';

const WARNING_LABELS: Record<string, string> = {
  large_request: 'large request',
  rate_limited: 'rate limited',
};

type HistoryBucket = 'generic' | 'anthropicMessages' | 'openaiChatCompletions';

const BUCKET_LABELS: Record<HistoryBucket, string> = {
  generic: 'Generic chat',
  anthropicMessages: 'Anthropic Messages',
  openaiChatCompletions: 'OpenAI Chat Completions',
};

function WarningTags({ warnings }: { warnings?: string[] }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="history-warnings">
      {warnings.map((warning) => (
        <span key={warning} className="warning-tag">
          ⚠ {WARNING_LABELS[warning] ?? warning}
        </span>
      ))}
    </div>
  );
}

/** Renders a generic-interface chat message as markdown (SPEC §7) — real
 *  natural-language LLM output, unlike the provider-specific interfaces'
 *  requestSummary/responseSummary below, which are raw JSON snippets and
 *  stay plain text. No raw-HTML plugin enabled, so this can't be used to
 *  inject markup even if a response tried to. */
function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function GenericHistoryList({ cardTheme }: { cardTheme: HistoryCardTheme }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    listGenericHistory().then(setHistory);
  }, []);

  async function handleClear() {
    await clearGenericHistory();
    setHistory(await listGenericHistory());
  }

  return (
    <>
      <div className="history-bucket-header">
        {history.length > 0 && (
          <button type="button" onClick={handleClear}>
            Clear all
          </button>
        )}
      </div>
      {history.length === 0 && <p>No requests yet.</p>}
      <ul
        className={
          cardTheme === 'light' ? 'history-list light-cards' : 'history-list'
        }
      >
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
                <WarningTags warnings={entry.warnings} />
                {lastMessage && (
                  <div className="history-prompt">
                    <span className="history-prompt-role">
                      {lastMessage.role}:
                    </span>
                    <MarkdownMessage content={lastMessage.content} />
                  </div>
                )}
                <div
                  className={
                    entry.outcome.ok ? 'history-result' : 'history-error'
                  }
                >
                  <span className="history-prompt-role">
                    {entry.outcome.ok ? 'assistant:' : 'error:'}
                  </span>
                  {entry.outcome.ok ? (
                    <MarkdownMessage content={entry.outcome.message} />
                  ) : (
                    ` ${entry.outcome.error}`
                  )}
                </div>
              </li>
            );
          })}
      </ul>
    </>
  );
}

// The two provider-specific interfaces log to their own storage bucket
// (SPEC §7) but share this exact entry shape — one renderer, parameterized
// by which module it's showing.
interface NativeHistoryEntry {
  id: string;
  origin: string;
  timestamp: number;
  providerLabel: string;
  requestSummary: string;
  outcome: { ok: true; responseSummary: string } | { ok: false; error: string };
  warnings?: string[];
}

interface NativeHistoryModule {
  listHistory: () => Promise<NativeHistoryEntry[]>;
  clearHistory: () => Promise<void>;
}

function NativeHistoryList({
  module,
  cardTheme,
}: {
  module: NativeHistoryModule;
  cardTheme: HistoryCardTheme;
}) {
  const [history, setHistory] = useState<NativeHistoryEntry[]>([]);

  useEffect(() => {
    module.listHistory().then(setHistory);
  }, [module]);

  async function handleClear() {
    await module.clearHistory();
    setHistory(await module.listHistory());
  }

  return (
    <>
      <div className="history-bucket-header">
        {history.length > 0 && (
          <button type="button" onClick={handleClear}>
            Clear all
          </button>
        )}
      </div>
      {history.length === 0 && <p>No requests yet.</p>}
      <ul
        className={
          cardTheme === 'light' ? 'history-list light-cards' : 'history-list'
        }
      >
        {[...history]
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((entry) => (
            <li key={entry.id}>
              <div className="history-meta">
                <strong>{entry.origin}</strong>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                <span>{entry.providerLabel}</span>
              </div>
              <WarningTags warnings={entry.warnings} />
              <div className="history-prompt">{entry.requestSummary}</div>
              <div
                className={
                  entry.outcome.ok ? 'history-result' : 'history-error'
                }
              >
                {entry.outcome.ok
                  ? entry.outcome.responseSummary
                  : entry.outcome.error}
              </div>
            </li>
          ))}
      </ul>
    </>
  );
}

function HistorySection() {
  const [bucket, setBucket] = useState<HistoryBucket>('generic');
  const [cardTheme, setCardTheme] = useState<HistoryCardTheme>('dark');

  useEffect(() => {
    getHistoryCardTheme().then(setCardTheme);
  }, []);

  async function handleSetCardTheme(theme: HistoryCardTheme) {
    await setHistoryCardTheme(theme);
    setCardTheme(theme);
  }

  return (
    <section>
      <div className="section-header">
        <h2>History</h2>
        <fieldset className="card-theme-toggle" aria-label="Card theme">
          <button
            type="button"
            className={
              cardTheme === 'dark'
                ? 'card-theme-button active'
                : 'card-theme-button'
            }
            onClick={() => handleSetCardTheme('dark')}
          >
            Dark
          </button>
          <button
            type="button"
            className={
              cardTheme === 'light'
                ? 'card-theme-button active'
                : 'card-theme-button'
            }
            onClick={() => handleSetCardTheme('light')}
          >
            Light
          </button>
        </fieldset>
      </div>

      <div className="tab-bar" role="tablist">
        {(Object.keys(BUCKET_LABELS) as HistoryBucket[]).map((key) => (
          <button
            type="button"
            key={key}
            role="tab"
            aria-selected={bucket === key}
            className={bucket === key ? 'tab active' : 'tab'}
            onClick={() => setBucket(key)}
          >
            {BUCKET_LABELS[key]}
          </button>
        ))}
      </div>

      {bucket === 'generic' && <GenericHistoryList cardTheme={cardTheme} />}
      {bucket === 'anthropicMessages' && (
        <NativeHistoryList
          module={anthropicMessagesHistory}
          cardTheme={cardTheme}
        />
      )}
      {bucket === 'openaiChatCompletions' && (
        <NativeHistoryList
          module={openaiChatCompletionsHistory}
          cardTheme={cardTheme}
        />
      )}
    </section>
  );
}

export default HistorySection;
