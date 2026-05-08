import { useState, type ChangeEvent } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Shield,
  AlertTriangle,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  RefreshCcw,
} from 'lucide-react';
import type { AppSettings } from '../../types';
import { exportPlannerData, importPlannerData, clearPlannerData } from '../../db/database';
import { FormGrid } from '../../components/ui/FormGrid';
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
    <section className="screen settings-layout">
      <div className="tool-panel">
        <div className="section-heading">
          <h2>Account & Sync</h2>
        </div>

        {!auth.firebaseEnabled && (
          <div className="info-card">
            <CloudOff aria-hidden className="info-icon" />
            <div>
              <strong>Local-only mode</strong>
              <p>
                Cloud sync is not configured for this build. Data stays on this device.
              </p>
            </div>
          </div>
        )}

        {auth.firebaseEnabled && !auth.user && (
          <div className="stack">
            <div className="info-card">
              <CloudOff aria-hidden className="info-icon" />
              <div>
                <strong>Signed out — local only</strong>
                <p>
                  Sign in with Google to sync your plans and logs across devices through
                  Firebase. Your existing local data will be merged into your account.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSignIn()}
              disabled={signingIn || auth.authLoading}
            >
              <LogIn aria-hidden />
              {signingIn ? 'Opening Google…' : 'Continue with Google'}
            </button>
            {signInError && (
              <p role="alert" className="error-text">
                {signInError}
              </p>
            )}
          </div>
        )}

        {auth.firebaseEnabled && auth.user && (
          <div className="stack">
            <div className="info-card">
              <Cloud aria-hidden className="info-icon" />
              <div>
                <strong>Signed in</strong>
                <p>
                  {auth.user.email ?? auth.user.displayName ?? auth.user.uid}
                </p>
              </div>
            </div>

            {auth.migration.phase !== 'done' && auth.migration.phase !== 'idle' && (
              <div className="info-card">
                <RefreshCcw aria-hidden className="info-icon" />
                <div>
                  <strong>{phaseLabel || 'Syncing'}</strong>
                  <p>This will only run once after sign-in.</p>
                </div>
              </div>
            )}

            {auth.migration.phase === 'error' && (
              <div className="stack">
                <div className="info-card warning">
                  <AlertTriangle aria-hidden className="info-icon" />
                  <div>
                    <strong>Sync failed</strong>
                    <p>{auth.migration.error ?? 'Migration could not finish.'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void auth.retryMigration()}
                >
                  <RefreshCcw aria-hidden />
                  Retry sync
                </button>
              </div>
            )}

            {auth.migration.phase === 'done' && (
              <div className="info-card">
                <Cloud aria-hidden className="info-icon" />
                <div>
                  <strong>Synced with Firebase</strong>
                  <p>
                    {auth.migration.result?.hadLocalData
                      ? `Migrated ${auth.migration.result.plansWritten} plans and ${auth.migration.result.logsWritten} logs.`
                      : 'Your account is ready. Changes save to the cloud automatically.'}
                  </p>
                </div>
              </div>
            )}

            <button type="button" className="menu-row" onClick={() => void handleSignOut()}>
              <div className="menu-icon">
                <LogOut aria-hidden />
              </div>
              <div className="menu-info">
                <strong>Sign out</strong>
                <p>Returns to a fresh local mode on this device.</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="tool-panel">
        <div className="section-heading">
          <h2>Preferences</h2>
        </div>
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

        <div className="info-card-list">
          <div className="info-card">
            <Shield aria-hidden className="info-icon" />
            <div>
              <strong>{auth.user ? 'Synced with Google' : 'Stays on your device'}</strong>
              <p>
                {auth.user
                  ? 'Your planner data is stored in your Firebase account.'
                  : 'Data stays entirely on your device until you sign in.'}
              </p>
            </div>
          </div>
          <div className="info-card warning">
            <AlertTriangle aria-hidden className="info-icon" />
            <div>
              <strong>Not Medical Advice</strong>
              <p>Educational tool only. Consult a clinician.</p>
            </div>
          </div>
        </div>
      </div>

      <aside className="result-panel">
        <div className="section-heading">
          <h2>Data Management</h2>
        </div>
        <div className="stack">
          <button type="button" className="menu-row" onClick={() => void exportPlannerData()}>
            <div className="menu-icon"><Download aria-hidden /></div>
            <div className="menu-info">
              <strong>Export JSON</strong>
              <p>Download a backup of your data</p>
            </div>
          </button>

          <label className="menu-row clickable">
            <div className="menu-icon"><Upload aria-hidden /></div>
            <div className="menu-info">
              <strong>Import JSON</strong>
              <p>Restore from a previous backup</p>
            </div>
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>

          <button type="button" className="menu-row danger" onClick={handleClear}>
            <div className="menu-icon"><RotateCcw aria-hidden /></div>
            <div className="menu-info">
              <strong>Clear local data</strong>
              <p>Permanently delete everything</p>
            </div>
          </button>
        </div>
      </aside>
    </section>
  );
}
