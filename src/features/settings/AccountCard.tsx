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
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../auth/AuthProvider';
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
      return { label: 'Reading data…', icon: <RefreshCcw aria-hidden />, tone: 'progress' };
    case 'writing':
      return { label: 'Uploading to your account…', icon: <RefreshCcw aria-hidden />, tone: 'progress' };
    case 'verifying':
      return { label: 'Verifying cloud copy…', icon: <RefreshCcw aria-hidden />, tone: 'progress' };
    case 'clearing-local':
      return { label: 'Tidying local data…', icon: <RefreshCcw aria-hidden />, tone: 'progress' };
    case 'error':
      return { label: 'Sync paused', icon: <AlertTriangle aria-hidden />, tone: 'error' };
    case 'done':
    case 'idle':
    default:
      return { label: 'Synced with Google', icon: <Check aria-hidden />, tone: 'done' };
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
      <Card variant="panel" className={cx(styles['account-card'], styles['settings-card-full'])}>
        <div className={styles['account-row']}>
          <div className={cx(styles['account-avatar'], styles['account-avatar-local'])}>
            <CloudOff aria-hidden />
          </div>
          <div className={styles['account-meta']}>
            <strong>Local mode</strong>
            <span>Data stays on this device.</span>
          </div>
        </div>
      </Card>
    );
  }

  // Signed out — invite to sync.
  if (!auth.user) {
    return (
      <Card variant="panel" className={cx(styles['account-card'], styles['settings-card-full'])}>
        <div className={styles['account-row']}>
          <div className={cx(styles['account-avatar'], styles['account-avatar-empty'])}>
            <Cloud aria-hidden />
          </div>
          <div className={styles['account-meta']}>
            <strong>Sign in to sync</strong>
            <span>Your local plans merge into your account.</span>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => void handleSignIn()}
          disabled={signingIn || auth.authLoading}
          className={styles['account-cta']}
        >
          <LogIn aria-hidden />
          {signingIn ? 'Opening Google…' : 'Continue with Google'}
        </Button>
        {signInError && (
          <p role="alert" className={styles['error-text']}>
            {signInError}
          </p>
        )}
      </Card>
    );
  }

  // Signed in.
  const { user } = auth;
  const status = statusForPhase(auth.migration.phase);
  const showAvatarImage = Boolean(user.photoURL) && !avatarFailed;
  const showRetry = auth.migration.phase === 'error';
  const isProgress = status.tone === 'progress';

  return (
    <Card
      variant="panel"
      className={cx(
        styles['account-card'],
        styles['account-card-active'],
        styles['settings-card-full'],
      )}
    >
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
      <div className={styles['account-meta']}>
        <strong>{user.displayName ?? user.email ?? 'Signed in'}</strong>
        {user.email && user.displayName && <span>{user.email}</span>}
      </div>
      <div
        className={cx(
          styles['account-status'],
          styles[`account-status-${status.tone}`],
        )}
      >
        <span
          className={cx(
            styles['account-status-icon'],
            isProgress ? styles['account-status-spin'] : undefined,
          )}
        >
          {status.icon}
        </span>
        <span className={styles['account-status-label']}>{status.label}</span>
        {showRetry && (
          <button
            type="button"
            className={styles['account-status-retry']}
            onClick={() => void auth.retryMigration()}
          >
            Retry
          </button>
        )}
      </div>
      <div className={styles['account-actions']}>
        <Button variant="ghost" size="small" onClick={handleSignOut}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </div>
    </Card>
  );
}
