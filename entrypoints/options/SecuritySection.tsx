import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  disableVault,
  isVaultConfigured,
  isVaultUnlocked,
  lockVault,
  setUpVault,
  unlockVault,
} from '../../lib/vault';

function SecuritySection() {
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [isConfigured, isUnlocked] = await Promise.all([
      isVaultConfigured(),
      isVaultUnlocked(),
    ]);
    setConfigured(isConfigured);
    setUnlocked(isUnlocked);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSetUp(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await setUpVault(password);
      setPassword('');
      setConfirmPassword('');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const ok = await unlockVault(password);
      if (!ok) {
        setError('Incorrect password.');
        return;
      }
      setPassword('');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLockNow() {
    await lockVault();
    await refresh();
  }

  async function handleDisable() {
    if (
      !confirm(
        "Disable the vault? Every provider's API key will be decrypted back to plain storage.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await disableVault();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <section>
      <h2>Security</h2>
      <p>The vault enables encryption for your provider API keys.</p>
      <p>
        Optional. When a website requests access to an LLM, a pop-up will ask
        for the password. It stays unlocked for the rest of that browser
        session.
      </p>
      <p>
        <strong>There is no password recovery.</strong> If you forget it,
        encrypted keys are permanently unreadable. You'd need to delete and
        re-add those providers with a fresh API key.
      </p>

      {!configured && (
        <form onSubmit={handleSetUp}>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            Enable vault
          </button>
        </form>
      )}

      {configured && !unlocked && (
        <form onSubmit={handleUnlock}>
          <p>The vault is locked.</p>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            Unlock
          </button>
        </form>
      )}

      {configured && unlocked && (
        <div className="actions">
          <p>The vault is unlocked for this browser session.</p>
          <button type="button" onClick={handleLockNow} disabled={busy}>
            Lock now
          </button>
          <button type="button" onClick={handleDisable} disabled={busy}>
            Disable vault
          </button>
        </div>
      )}
    </section>
  );
}

export default SecuritySection;
