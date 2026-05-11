import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  RefreshCcw,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { cx } from '../../utils/ui/classNames';
import styles from '../../styles/app.module.css';

function initialFromName(name: string | null | undefined, email: string | null | undefined) {
  const source = (name ?? email ?? 'U').trim();
  return source.length > 0 ? source[0].toUpperCase() : 'U';
}

interface StatusConfig {
  label: string;
  icon: ReactNode;
  tone: 'done' | 'progress' | 'error';
}

function statusForPhase(phase: string): StatusConfig {
  switch (phase) {
    case 'reading-local':
    case 'reading-cloud':
      return { label: 'Reading data…', icon: <RefreshCcw aria-hidden className={styles['status-spin']} />, tone: 'progress' };
    case 'writing':
      return { label: 'Uploading…', icon: <RefreshCcw aria-hidden className={styles['status-spin']} />, tone: 'progress' };
    case 'verifying':
      return { label: 'Verifying…', icon: <RefreshCcw aria-hidden className={styles['status-spin']} />, tone: 'progress' };
    case 'clearing-local':
      return { label: 'Tidying data…', icon: <RefreshCcw aria-hidden className={styles['status-spin']} />, tone: 'progress' };
    case 'error':
      return { label: 'Sync paused', icon: <AlertTriangle aria-hidden />, tone: 'error' };
    case 'done':
    case 'idle':
    default:
      return { label: 'Synced', icon: <Check aria-hidden />, tone: 'done' };
  }
}

export function AccountCard() {
  const auth = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const handleSignIn = async () => {
    setSignInError(null);
    setSigningIn(true);
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = () => {
    void auth.signOut();
  };

  // Local-only build (Firebase not configured).
  if (!auth.firebaseEnabled) {
    return (
      <div className={styles['account-view']}>
        <div className={styles['account-profile']}>
          <div className={styles['account-avatar']}>
            <CloudOff aria-hidden />
          </div>
          <div className={styles['account-info']}>
            <strong>Local mode</strong>
            <span>Data stays on this device.</span>
          </div>
        </div>
      </div>
    );
  }

  // Signed out — invite to sync.
  if (!auth.user) {
    return (
      <div className={styles['account-view']}>
        <div className={styles['account-profile']}>
          <div className={styles['account-avatar']}>
            <Cloud aria-hidden />
          </div>
          <div className={styles['account-info']}>
            <strong>Sign in to sync</strong>
            <span>Merge plans to your account</span>
          </div>
        </div>
        <div className={styles['account-actions']}>
          <button
            type="button"
            className={cx(styles['account-btn'], styles['primary'])}
            onClick={() => void handleSignIn()}
            disabled={signingIn || auth.authLoading}
          >
            <LogIn aria-hidden />
            {signingIn ? 'Opening Google…' : 'Continue with Google'}
          </button>
        </div>
        {signInError && (
          <p role="alert" style={{ color: 'var(--status-missed)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            {signInError}
          </p>
        )}
      </div>
    );
  }

  // Signed in.
  const { user } = auth;
  const status = statusForPhase(auth.migration.phase);
  const showAvatarImage = Boolean(user.photoURL) && !avatarFailed;
  const showRetry = auth.migration.phase === 'error';

  return (
    <div className={styles['account-view']}>
      <div className={styles['account-profile']}>
        <div className={styles['account-avatar']}>
          {showAvatarImage ? (
            <img
              src={user.photoURL ?? ''}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span aria-hidden>{initialFromName(user.displayName, user.email)}</span>
          )}
        </div>
        <div className={styles['account-info']}>
          <strong>{user.displayName ?? user.email ?? 'Signed in'}</strong>
          {user.email && user.displayName && <span>{user.email}</span>}
        </div>
      </div>

      <div className={cx(styles['account-status-bar'], styles[status.tone])}>
        <div className={styles['status-icon']}>{status.icon}</div>
        <span>{status.label}</span>
      </div>

      <div className={styles['account-actions']}>
        {showRetry && (
          <button
            type="button"
            className={styles['account-btn']}
            onClick={() => void auth.retryMigration()}
          >
            <RefreshCcw aria-hidden />
            Retry Sync
          </button>
        )}
        <button type="button" className={styles['account-btn']} onClick={handleSignOut}>
          <LogOut aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );
}
