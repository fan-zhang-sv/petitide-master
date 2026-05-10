import { type ChangeEvent } from 'react';
import { AlertTriangle, Database, Download, RotateCcw, Upload } from 'lucide-react';
import type { AppSettings } from '../../types';
import { exportPlannerData, importPlannerData, clearPlannerData } from '../../db/database';
import { Card } from '../../components/ui/Card';
import { MenuRow } from '../../components/ui/MenuRow';
import { Screen } from '../../components/ui/Screen';
import { PageHeader, SectionHeader } from '../../components/ui/Header';
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
    <Screen className={cx(styles['settings-layout'], styles['settings-layout-tuned'])}>
      <PageHeader variant="plain" title="Settings" />

      <AccountCard />

      <Card variant="panel" className={styles['settings-panel']}>
        <SectionHeader title="Preferences" meta="Display & calculations" />
        <div className={styles['settings-rows']}>
          <div className={styles['settings-row']}>
            <span className={styles['settings-row-label']}>Dose unit</span>
            <select
              value={settings.preferredDoseUnit}
              onChange={(event) =>
                onSaveSettings({ preferredDoseUnit: event.target.value as 'mg' | 'mcg' | 'IU' })
              }
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
              <option value="IU">IU</option>
            </select>
          </div>
        </div>
      </Card>

      <Card variant="panel" className={styles['settings-panel']}>
        <SectionHeader
          title="Data"
          meta="Backup & reset"
          actions={<Database aria-hidden className={styles['settings-heading-icon']} />}
        />
        <div className={styles.stack}>
          <MenuRow
            icon={<Download aria-hidden />}
            title="Export backup"
            description="Download a JSON copy of your plans and logs"
            onClick={() => void exportPlannerData()}
          />
          <MenuRow
            as="label"
            icon={<Upload aria-hidden />}
            title="Import backup"
            description="Restore from a previous JSON file"
          >
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </MenuRow>
          <MenuRow
            danger
            icon={<RotateCcw aria-hidden />}
            title="Clear local data"
            description="Permanently delete everything on this device"
            onClick={handleClear}
          />
        </div>
      </Card>

      <SupportSection />

      <p className={styles['settings-disclaimer-pill']}>
        <AlertTriangle aria-hidden />
        Educational tool only — not medical advice.
      </p>
    </Screen>
  );
}
