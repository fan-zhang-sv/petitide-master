import { useEffect, useMemo, useState } from 'react';
import { Home, Syringe, CalendarDays, Settings } from 'lucide-react';
import styles from './styles/app.module.css';
import { cx } from './utils/ui/classNames';
import { usePlannerStore } from './db/usePlannerStore';
import type { MainTab, TabConfig } from './types';
import { todayIso, addIsoDays } from './utils/dates';
import { getStatusesForDate, getDayPlanStatus } from './utils/cycleEngine';
import { AuthProvider } from './auth/AuthProvider';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { MobileTabbar } from './components/layout/MobileTabbar';
import { AppHeader } from './components/layout/AppHeader';
import { Onboarding } from './components/layout/Onboarding';
import { Footer } from './components/ui/Footer';

// Feature Views
import { Dashboard } from './features/today/Dashboard';
import { PlansView } from './features/plans/PlansView';
import { CalendarView } from './features/calendar/CalendarView';
import { SettingsView } from './features/settings/SettingsView';

const mobileTabs: TabConfig[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'plans', label: 'Plans', icon: Syringe },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const desktopTabs: TabConfig[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'plans', label: 'Plans', icon: Syringe },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function AppShell() {
  const store = usePlannerStore();
  const [activeTab, setActiveTab] = useState<MainTab>('today');

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (!navigator.userAgent.includes('jsdom')) {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [activeTab]);

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
      <main className={cx(styles['app-shell'], styles.centered)}>
        <div className={styles['loading-card']}>
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
    <main className={styles['app-shell']}>
      <Sidebar
        activeTab={activeTab}
        tabs={desktopTabs}
        onTabChange={setActiveTab}
      />

      <section className={styles['app-content']}>
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
        {activeTab === 'settings' && (
          <SettingsView
            settings={store.settings}
            onSaveSettings={store.saveSettings}
            onRefresh={store.refresh}
          />
        )}
        <Footer meta="Local-first planner. Data stays on this device." />
      </section>
    </main>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
