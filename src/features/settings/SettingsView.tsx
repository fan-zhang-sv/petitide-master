import type { ChangeEvent } from 'react';
import { Database, Download, RotateCcw, Upload } from 'lucide-react';
import type { AppSettings } from '../../types';
import { exportPlannerData, importPlannerData, clearPlannerData } from '../../db/database';
import { Card } from '../../components/ui/Card';
import { FormGrid } from '../../components/ui/FormGrid';
import { MenuRow } from '../../components/ui/MenuRow';
import { Screen } from '../../components/ui/Screen';
import { PageHeader, SectionHeader } from '../../components/ui/Header';
import styles from '../../styles/app.module.css';

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

  return (
    <Screen className={styles['settings-layout']}>
      <PageHeader
        variant="plain"
        title="Settings"
        meta="Local preferences and backup"
      />

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

        <p className={styles['settings-note']}>Planner data stays on this device unless you export or import a backup.</p>
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
