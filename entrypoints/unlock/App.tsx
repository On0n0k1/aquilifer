import { type FormEvent, useState } from 'react';
import {
  AQUILIFER_INTERNAL_KIND,
  type ResolveUnlockMessage,
} from '../../lib/internal-protocol';
import { unlockVault } from '../../lib/vault';

function App() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function notifyBackground(unlocked: boolean) {
    const message: ResolveUnlockMessage = {
      kind: AQUILIFER_INTERNAL_KIND,
      type: 'resolveUnlock',
      unlocked,
    };
    await browser.runtime.sendMessage(message);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const unlocked = await unlockVault(password);
      if (!unlocked) {
        setError('Incorrect password.');
        return;
      }
      await notifyBackground(true);
      window.close();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    await notifyBackground(false);
    window.close();
  }

  return (
    <main>
      <h1>Unlock Aquilifer</h1>
      <p>Enter your vault password to continue.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Password
          {/* This popup's entire purpose is "type your password now" —
              unlike a consent button, there's no blind-accept risk, and it
              matches every real password manager's unlock prompt. */}
          <input
            type="password"
            value={password}
            // biome-ignore lint/a11y/noAutofocus: see comment above
            autoFocus
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />
        </label>
        {error && <p className="warning">{error}</p>}
        <div className="actions">
          <button type="button" onClick={cancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" disabled={submitting || !password}>
            Unlock
          </button>
        </div>
      </form>
    </main>
  );
}

export default App;
