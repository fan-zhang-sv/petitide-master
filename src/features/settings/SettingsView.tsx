import type { ChangeEvent } from 'react';
import { Download, Upload, RotateCcw, Shield, AlertTriangle } from 'lucide-react';
import type { AppSettings } from '../../types';
import { exportPlannerData, importPlannerData, clearPlannerData } from '../../db/database';
import { FormGrid } from '../../components/ui/FormGrid';

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
    <section className="screen settings-layout">
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
              <strong>Privacy First</strong>
              <p>Data stays entirely on your device.</p>
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
