import { useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Cloud,
  CloudOff,
  Database,
  Download,
  LogIn,
  LogOut,
  RefreshCcw,
  RotateCcw,
  Shield,
  Upload,
} from 'lucide-react';
import type { AppSettings } from '../../types';
import { exportPlannerData, importPlannerData, clearPlannerData } from '../../db/database';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormGrid } from '../../components/ui/FormGrid';
import { MenuRow } from '../../components/ui/MenuRow';
import { Screen } from '../../components/ui/Screen';
import { PageHeader, SectionHeader } from '../../components/ui/Header';
import styles from '../../styles/app.module.css';
import { useAuth } from '../../auth/AuthProvider';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const phaseLabels: Record<string, string> = {
  'reading-local': 'Reading local data…',
  'reading-cloud': 'Reading cloud data…',
  writing: 'Uploading to your account…',
  verifying: 'Verifying cloud copy…',
  'clearing-local': 'Clearing local data…',
  done: 'Sync complete',
  error: 'Sync error',
  idle: '',
};

export function SettingsView({
  settings,
  onSaveSettings,
  onRefresh,
}: SettingsViewProps) {
  const auth = useAuth();
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        try {
          await importPlannerData(content);
          await onRefresh();
          alert('Data imported successfully');
        } catch {
          alert('Failed to import data');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Delete all data? This cannot be undone.')) {
      await clearPlannerData();
      await onRefresh();
      window.location.reload();
    }
  };

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

  const handleSignOut = async () => {
    await auth.signOut();
  };

  const phaseLabel = phaseLabels[auth.migration.phase] ?? '';

  return (
    <Screen className={styles['settings-layout']}>
      <PageHeader
        variant="plain"
        title="Settings"
        meta={auth.user ? 'Synced with Google' : 'Local preferences and backup'}
      />

      <Card variant="panel" className={styles['settings-panel']}>
        <SectionHeader title="Account & Sync" />

        {!auth.firebaseEnabled && (
          <Card variant="info">
            <CloudOff aria-hidden className={styles['info-icon']} />
            <div>
              <strong>Local-only mode</strong>
              <p>Cloud sync is not configured for this build. Data stays on this device.</p>
            </div>
          </Card>
        )}

        {auth.firebaseEnabled && !auth.user && (
          <div className={styles.stack}>
            <Card variant="info">
              <CloudOff aria-hidden className={styles['info-icon']} />
              <div>
                <strong>Signed out — local only</strong>
                <p>
                  Sign in with Google to sync your plans and logs across devices through
                  Firebase. Your existing local data will be merged into your account.
                </p>
              </div>
            </Card>
            <Button
              variant="primary"
              onClick={() => void handleSignIn()}
              disabled={signingIn || auth.authLoading}
            >
              <LogIn aria-hidden />
              {signingIn ? 'Opening Google…' : 'Continue with Google'}
            </Button>
            {signInError && (
              <p role="alert" className={styles['error-text']}>
                {signInError}
              </p>
            )}
          </div>
        )}

        {auth.firebaseEnabled && auth.user && (
          <div className={styles.stack}>
            <Card variant="info">
              <Cloud aria-hidden className={styles['info-icon']} />
              <div>
                <strong>Signed in</strong>
                <p>{auth.user.email ?? auth.user.displayName ?? auth.user.uid}</p>
              </div>
            </Card>

            {auth.migration.phase !== 'done' && auth.migration.phase !== 'idle' && (
              <Card variant="info">
                <RefreshCcw aria-hidden className={styles['info-icon']} />
                <div>
                  <strong>{phaseLabel || 'Syncing'}</strong>
                  <p>This will only run once after sign-in.</p>
                </div>
              </Card>
            )}

            {auth.migration.phase === 'error' && (
              <div className={styles.stack}>
                <Card variant="info" tone="warning">
                  <AlertTriangle aria-hidden className={styles['info-icon']} />
                  <div>
                    <strong>Sync failed</strong>
                    <p>{auth.migration.error ?? 'Migration could not finish.'}</p>
                  </div>
                </Card>
                <Button variant="primary" onClick={() => void auth.retryMigration()}>
                  <RefreshCcw aria-hidden />
                  Retry sync
                </Button>
              </div>
            )}

            {auth.migration.phase === 'done' && (
              <Card variant="info">
                <Cloud aria-hidden className={styles['info-icon']} />
                <div>
                  <strong>Synced with Firebase</strong>
                  <p>
                    {auth.migration.result?.hadLocalData
                      ? `Migrated ${auth.migration.result.plansWritten} plans and ${auth.migration.result.logsWritten} logs.`
                      : 'Your account is ready. Changes save to the cloud automatically.'}
                  </p>
                </div>
              </Card>
            )}

            <MenuRow
              icon={<LogOut aria-hidden />}
              title="Sign out"
              description="Returns to a fresh local mode on this device."
              onClick={() => void handleSignOut()}
            />
          </div>
        )}
      </Card>

      <Card variant="panel" className={styles['settings-panel']}>
        <SectionHeader title="Preferences" />
        <FormGrid>
          <label>
            Preferred dose unit
            <select
              value={settings.preferredDoseUnit}
              onChange={(event) => onSaveSettings({ preferredDoseUnit: event.target.value as 'mg' | 'mcg' | 'IU' })}
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
              <option value="IU">IU</option>
            </select>
          </label>
        </FormGrid>

        <Card variant="info">
          <Shield aria-hidden className={styles['info-icon']} />
          <div>
            <strong>{auth.user ? 'Synced with Google' : 'Stays on your device'}</strong>
            <p>
              {auth.user
                ? 'Your planner data is stored in your Firebase account.'
                : 'Data stays entirely on your device until you sign in.'}
            </p>
          </div>
        </Card>
        <Card variant="info" tone="warning">
          <AlertTriangle aria-hidden className={styles['info-icon']} />
          <div>
            <strong>Not Medical Advice</strong>
            <p>Educational tool only. Consult a clinician.</p>
          </div>
        </Card>

        <p className={styles['settings-note']}>
          {auth.user
            ? 'Changes you make here also save to your Firebase account.'
            : 'Planner data stays on this device unless you export or import a backup.'}
        </p>
      </Card>

      <Card as="aside" variant="panel" className={styles['settings-panel']}>
        <SectionHeader
          title="Backup"
          meta="JSON import and export"
          actions={<Database aria-hidden className={styles['settings-heading-icon']} />}
        />
        <div className={styles.stack}>
          <MenuRow
            icon={<Download aria-hidden />}
            title="Export JSON"
            description="Download a backup of your data"
            onClick={() => void exportPlannerData()}
          />

          <MenuRow
            as="label"
            icon={<Upload aria-hidden />}
            title="Import JSON"
            description="Restore from a previous backup"
          >
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </MenuRow>
        </div>
      </Card>

      <Card variant="panel" className={styles['settings-panel']}>
        <SectionHeader title="Reset" meta="Destructive local action" />
        <div className={styles.stack}>
          <MenuRow
            danger
            icon={<RotateCcw aria-hidden />}
            title="Clear local data"
            description="Permanently delete everything"
            onClick={handleClear}
          />
        </div>
      </Card>
    </Screen>
  );
}
