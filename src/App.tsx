import { useMemo, useState } from 'react';
import { Home, Syringe, CalendarDays, Settings, Calculator } from 'lucide-react';
import './App.css';
import { usePlannerStore } from './db/usePlannerStore';
import type { MainTab, TabConfig } from './types';
import { todayIso, addIsoDays } from './utils/dates';
import { getStatusesForDate, getDayPlanStatus } from './utils/cycleEngine';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { MobileTabbar } from './components/layout/MobileTabbar';
import { AppHeader } from './components/layout/AppHeader';
import { Onboarding } from './components/layout/Onboarding';

// Feature Views
import { Dashboard } from './features/today/Dashboard';
import { PlansView } from './features/plans/PlansView';
import { CalendarView } from './features/calendar/CalendarView';
import { ToolsView } from './features/tools/ToolsView';
import { DoseMathView } from './features/dose-math/DoseMathView';
import { SettingsView } from './features/settings/SettingsView';

const mobileTabs: TabConfig[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'plans', label: 'Plans', icon: Syringe },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'tools', label: 'Tools', icon: Settings },
];

const desktopTabs: TabConfig[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'plans', label: 'Plans', icon: Syringe },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'dose-math', label: 'Dose Math', icon: Calculator },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function App() {
  const store = usePlannerStore();
  const [activeTab, setActiveTab] = useState<MainTab>('today');

  const today = todayIso();
  const todayStatuses = useMemo(() => getStatusesForDate(store.activePlans, store.logs, today), [
    store.activePlans,
    store.logs,
    today,
  ]);
  
  const overdueStatuses = useMemo(() => 
    store.activePlans
      .flatMap((plan) =>
        Array.from({ length: 14 }, (_, index) => {
          const date = addIsoDays(today, -index);
          return getDayPlanStatus(plan, store.logs, date, today);
        })
      )
      .filter((status) => status.overdue),
    [store.activePlans, store.logs, today]
  );

  if (store.loading || !store.settings) {
    return (
      <main className="app-shell centered">
        <div className="loading-card">
          <Syringe aria-hidden />
          <span>Loading planner</span>
        </div>
      </main>
    );
  }

  if (!store.settings.onboardingAccepted) {
    return <Onboarding onAccept={store.acceptOnboarding} />;
  }

  return (
    <main className="app-shell">
      <Sidebar
        activeTab={activeTab}
        tabs={desktopTabs}
        onTabChange={setActiveTab}
      />

      <section className="app-content">
        <AppHeader />
        <MobileTabbar
          activeTab={activeTab}
          tabs={mobileTabs}
          onTabChange={setActiveTab}
        />

        {activeTab === 'today' && (
          <Dashboard
            plans={store.activePlans}
            logs={store.logs}
            todayStatuses={todayStatuses}
            overdueStatuses={overdueStatuses}
            onLog={store.addLog}
            onOpenCatalog={() => setActiveTab('plans')}
          />
        )}
        {activeTab === 'plans' && (
          <PlansView
            plans={store.activePlans}
            logs={store.logs}
            onArchive={store.archivePlan}
            onUpdatePlan={store.updatePlan}
            onAddPlan={store.addPlan}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView
            plans={store.activePlans}
            logs={store.logs}
            onLog={store.addLog}
          />
        )}
        {activeTab === 'tools' && (
          <ToolsView
            plans={store.activePlans}
            onUpdatePlan={store.updatePlan}
            settings={store.settings}
            onSaveSettings={store.saveSettings}
            onRefresh={store.refresh}
          />
        )}
        {activeTab === 'dose-math' && (
          <DoseMathView
            plans={store.activePlans}
            onUpdatePlan={store.updatePlan}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            settings={store.settings}
            onSaveSettings={store.saveSettings}
            onRefresh={store.refresh}
          />
        )}
      </section>
    </main>
  );
}

export default App;
