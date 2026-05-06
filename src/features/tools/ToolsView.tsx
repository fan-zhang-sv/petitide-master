import { useState } from 'react';
import { Calculator, Settings, ChevronRight } from 'lucide-react';
import type { PlannedPeptide, AppSettings } from '../../types';
import { DoseMathView } from '../dose-math/DoseMathView';
import { SettingsView } from '../settings/SettingsView';

interface ToolsViewProps {
  plans: PlannedPeptide[];
  onUpdatePlan: (id: string, patch: Partial<PlannedPeptide>) => Promise<void>;
  settings: AppSettings;
  onSaveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function ToolsView({
  plans,
  onUpdatePlan,
  settings,
  onSaveSettings,
  onRefresh,
}: ToolsViewProps) {
  const [activeTool, setActiveTool] = useState<'menu' | 'calculator' | 'settings'>('menu');

  if (activeTool === 'calculator') {
    return (
      <div className="sub-view">
        <header className="sub-header">
          <button type="button" className="ghost-button small" onClick={() => setActiveTool('menu')}>
            ← Back to Tools
          </button>
        </header>
        <DoseMathView plans={plans} onUpdatePlan={onUpdatePlan} />
      </div>
    );
  }

  if (activeTool === 'settings') {
    return (
      <div className="sub-view">
        <header className="sub-header">
          <button type="button" className="ghost-button small" onClick={() => setActiveTool('menu')}>
            ← Back to Tools
          </button>
        </header>
        <SettingsView settings={settings} onSaveSettings={onSaveSettings} onRefresh={onRefresh} />
      </div>
    );
  }

  return (
    <section className="screen">
      <div className="section-heading">
        <h2>Tools & Utilities</h2>
      </div>
      <div className="menu-list">
        <button className="menu-row" onClick={() => setActiveTool('calculator')}>
          <div className="menu-icon"><Calculator aria-hidden /></div>
          <div className="menu-info">
            <h3>Dose Math</h3>
            <p>Reconstitution calculator</p>
          </div>
          <ChevronRight aria-hidden className="menu-chevron" />
        </button>
        <button className="menu-row" onClick={() => setActiveTool('settings')}>
          <div className="menu-icon"><Settings aria-hidden /></div>
          <div className="menu-info">
            <h3>Settings</h3>
            <p>Preferences and data backup</p>
          </div>
          <ChevronRight aria-hidden className="menu-chevron" />
        </button>
      </div>
    </section>
  );
}
