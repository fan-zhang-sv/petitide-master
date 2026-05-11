import { type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Cloud,
  Database,
  Download,
  Ruler,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { AppSettings } from '../../types';
import { exportPlannerData, importPlannerData, clearPlannerData } from '../../db/database';
import { Screen } from '../../components/ui/Screen';
import { cx } from '../../utils/ui/classNames';
import styles from '../../styles/app.module.css';
import { AccountCard } from './AccountCard';
import { SupportSection } from './SupportSection';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function SettingsView({
  settings,
  onSaveSettings,
  onRefresh,
}: SettingsViewProps) {
  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
  };

  const handleClear = async () => {
    if (!window.confirm('Delete all local data? This cannot be undone.')) return;
    await clearPlannerData();
    await onRefresh();
    window.location.reload();
  };

  return (
    <Screen className={styles['settings-workspace']}>
      <div className={styles['settings-bento']}>
        {/* Account Panel */}
        <div className={cx(styles['bento-panel'], styles['bento-account'])}>
          <AccountCard />
        </div>

        {/* Preferences Panel */}
        <div className={cx(styles['bento-panel'], styles['bento-pref'])}>
          <div className={styles['bento-header-group']}>
            <div>
              <h2>Preferences</h2>
              <span>Defaults for new entries</span>
            </div>
            <Ruler className={styles['bento-icon']} aria-hidden />
          </div>
          <label className={styles['pref-row']}>
            <div className={styles['pref-info']}>
              <strong>Dose unit</strong>
              <span>Preferred display</span>
            </div>
            <select
              className={styles['pref-select']}
              aria-label="Preferred dose unit"
              value={settings.preferredDoseUnit}
              onChange={(event) =>
                onSaveSettings({ preferredDoseUnit: event.target.value as 'mg' | 'mcg' | 'IU' })
              }
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
              <option value="IU">IU</option>
            </select>
          </label>
        </div>

        {/* Device Panel */}
        <div className={cx(styles['bento-panel'], styles['bento-device'])}>
          <div className={styles['bento-header-group']}>
            <div>
              <h2>Device</h2>
              <span>PWA storage</span>
            </div>
            <Cloud className={styles['bento-icon']} aria-hidden />
          </div>
          <div className={styles['device-card']}>
            <span className={styles['kicker']}>Local-first</span>
            <strong>Data stays here</strong>
            <p>Backups are portable JSON files you control.</p>
          </div>
        </div>

        {/* Data Panel */}
        <div className={cx(styles['bento-panel'], styles['bento-data'])}>
          <div className={styles['bento-header-group']}>
            <div>
              <h2>Data</h2>
              <span>Backup or reset</span>
            </div>
            <Database className={styles['bento-icon']} aria-hidden />
          </div>
          <div className={styles['action-list']}>
            <button type="button" className={styles['action-item']} onClick={() => void exportPlannerData()}>
              <div className={styles['action-icon']}><Download aria-hidden /></div>
              <div className={styles['action-text']}>
                <strong>Export backup</strong>
                <span>Download JSON copy</span>
              </div>
            </button>
            <label className={styles['action-item']}>
              <div className={styles['action-icon']}><Upload aria-hidden /></div>
              <div className={styles['action-text']}>
                <strong>Import backup</strong>
                <span>Restore from JSON</span>
              </div>
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
            <button type="button" className={cx(styles['action-item'], styles['danger'])} onClick={handleClear}>
              <div className={styles['action-icon']}><RotateCcw aria-hidden /></div>
              <div className={styles['action-text']}>
                <strong>Clear local data</strong>
                <span>Permanently delete everything</span>
              </div>
            </button>
          </div>
        </div>

        {/* Support Panel */}
        <div className={cx(styles['bento-panel'], styles['bento-support'])}>
          <SupportSection />
        </div>
      </div>

      <p className={styles['disclaimer']}>
        <AlertTriangle aria-hidden />
        Educational tool only. Not medical advice.
      </p>
    </Screen>
  );
}
