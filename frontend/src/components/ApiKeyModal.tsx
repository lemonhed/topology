import React, { useState } from 'react';
import {
  encryptAndStore,
  decryptFromStorage,
  clearSavedKey,
} from '../lib/secureStorage';

interface ApiKeyModalProps {
  onApiKeySubmit: (apiKey: string) => void;
  error?: string | null;
  isLoading: boolean;
  hasSavedApiKey: boolean;
}

export function ApiKeyModal({ onApiKeySubmit, error, isLoading, hasSavedApiKey }: ApiKeyModalProps) {
  // Which view to show
  const [mode, setMode] = useState<'unlock' | 'enter'>(hasSavedApiKey ? 'unlock' : 'enter');

  // Track if a saved key still exists (can change after "Forget")
  const [keyStillSaved, setKeyStillSaved] = useState(hasSavedApiKey);

  // "Enter key" view state
  const [apiKey, setApiKey] = useState('');
  const [pin, setPin] = useState('');
  const [saveKey, setSaveKey] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // "Unlock" view state
  const [unlockPin, setUnlockPin] = useState('');

  const handleEnterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || isLoading) return;
    setLocalError(null);

    if (saveKey) {
      if (pin.length < 4) {
        setLocalError('PIN must be at least 4 characters');
        return;
      }
      try {
        await encryptAndStore(apiKey.trim(), pin);
      } catch {
        setLocalError('Failed to save key');
        return;
      }
    }

    onApiKeySubmit(apiKey.trim());
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPin || isLoading) return;
    setLocalError(null);

    try {
      const decryptedKey = await decryptFromStorage(unlockPin);
      onApiKeySubmit(decryptedKey);
    } catch {
      setLocalError('Incorrect PIN. Try again or use a different key.');
    }
  };

  const handleForgetKey = () => {
    clearSavedKey();
    setKeyStillSaved(false);
    setMode('enter');
    setLocalError(null);
    setUnlockPin('');
  };

  const displayError = localError || error;

  // ── Unlock view (returning user with saved key) ─────────────────

  if (mode === 'unlock') {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.lockIcon}>&#128274;</div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.description}>
            Your API key is saved. Enter your PIN to unlock it.
          </p>
          <form onSubmit={handleUnlockSubmit}>
            <input
              type="password"
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value)}
              placeholder="Enter your PIN"
              style={styles.input}
              disabled={isLoading}
              autoFocus
            />
            {displayError && <p style={styles.error}>{displayError}</p>}
            <button type="submit" style={styles.button} disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Unlock & Connect'}
            </button>
          </form>
          <div style={styles.footerActions}>
            <button
              onClick={() => { setMode('enter'); setLocalError(null); }}
              style={styles.textButton}
            >
              Use a different key
            </button>
            <span style={styles.footerDivider}>&#183;</span>
            <button onClick={handleForgetKey} style={styles.textButtonDanger}>
              Forget saved key
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Enter key view (first visit or switching keys) ──────────────

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>OpenAI API Key Required</h2>
        <p style={styles.description}>
          Enter your OpenAI API key to enable real-time voice and AI features.
        </p>
        <form onSubmit={handleEnterSubmit}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={styles.input}
            disabled={isLoading}
            autoFocus
          />

          {/* Save checkbox */}
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={saveKey}
              onChange={(e) => setSaveKey(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxLabel}>Save for next time</span>
          </label>

          {/* PIN field (shown when save is checked) */}
          {saveKey && (
            <div style={styles.pinSection}>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Choose a PIN (4+ characters)"
                style={styles.input}
                disabled={isLoading}
              />
              <p style={styles.hint}>
                Your key is encrypted with this PIN and stored locally in your browser.
              </p>
            </div>
          )}

          {displayError && <p style={styles.error}>{displayError}</p>}
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
        <p style={styles.footer}>
          Get your key from the{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={styles.link}>
            OpenAI dashboard
          </a>.
        </p>
        {keyStillSaved && (
          <button
            onClick={() => { setMode('unlock'); setLocalError(null); }}
            style={styles.textButton}
          >
            &#8592; Back to unlock
          </button>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center' as const,
  },
  lockIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#111827',
  },
  description: {
    margin: '0 0 1.5rem',
    fontSize: '0.9rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box' as const,
    marginBottom: '1rem',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    cursor: 'pointer',
    justifyContent: 'flex-start',
    textAlign: 'left' as const,
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#4a7dff',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: '0.9rem',
    color: '#374151',
  },
  pinSection: {
    marginBottom: '0.25rem',
  },
  hint: {
    fontSize: '0.78rem',
    color: '#9ca3af',
    marginTop: '-0.75rem',
    marginBottom: '1rem',
    textAlign: 'left' as const,
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#4a7dff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.875rem',
    marginTop: '-0.5rem',
    marginBottom: '1rem',
  },
  footer: {
    marginTop: '1.5rem',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  link: {
    color: '#4a7dff',
    textDecoration: 'none',
  },
  footerActions: {
    marginTop: '1.25rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.25rem',
  },
  footerDivider: {
    color: '#d1d5db',
    fontSize: '1rem',
  },
  textButton: {
    background: 'none',
    border: 'none',
    color: '#4a7dff',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.25rem',
    marginTop: '0.5rem',
  },
  textButtonDanger: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.25rem',
  },
};
