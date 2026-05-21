import { useEffect, useMemo, useState } from 'react';
import { Home, Syringe, CalendarDays, Settings } from 'lucide-react';
import styles from './styles/app.module.css';
import { cx } from './utils/ui/classNames';
import { usePlannerStore } from './db/usePlannerStore';
import type { MainTab, TabConfig } from './types';
import { todayIso } from './utils/dates';
import { getStatusesForDate } from './utils/cycleEngine';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/AuthContext';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { MobileTabbar } from './components/layout/MobileTabbar';
import { AppHeader } from './components/layout/AppHeader';
import { Onboarding } from './components/layout/Onboarding';
import { InstallPrompt } from './components/layout/InstallPrompt';
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
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>('today');
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (!navigator.userAgent.includes('jsdom')) {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [activeTab]);

  useEffect(() => {
    const waitingForStore = store.loading || !store.settings;
    const timer = setTimeout(() => {
      setLoadingTimeout(waitingForStore);
    }, waitingForStore ? 6000 : 0);

    return () => clearTimeout(timer);
  }, [store.loading, store.settings]);

  const today = todayIso();
  const todayStatuses = useMemo(() => getStatusesForDate(store.activePlans, store.logs, today), [
    store.activePlans,
    store.logs,
    today,
  ]);
  


  if (store.loading || !store.settings) {
    return (
      <main className={cx(styles['app-shell'], styles.centered)}>
        <div 
          className={styles['loading-card']} 
          style={{ 
            flexDirection: 'column', 
            gap: '16px', 
            maxWidth: '380px', 
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 28px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Syringe aria-hidden className={styles['status-spin']} style={{ width: '24px', height: '24px' }} />
            <strong style={{ fontSize: '1.05rem' }}>Loading planner</strong>
          </div>
          {loadingTimeout && (
            <div 
              style={{ 
                marginTop: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px', 
                alignItems: 'center',
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                This is taking longer than expected. On iOS, third-party authentication redirects can sometimes lock local storage (IndexedDB) access.
              </p>
              <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={styles['primary-button']}
                  onClick={() => window.location.reload()}
                  style={{ minHeight: '38px', padding: '0 16px', fontSize: '0.85rem' }}
                >
                  Reload App
                </button>
                {auth.user && (
                  <button
                    type="button"
                    className={styles['ghost-button']}
                    onClick={async () => {
                      if (window.confirm("Would you like to sign out and fall back to local-first mode? Your local data remains safe on this device.")) {
                        try {
                          await auth.signOut();
                          window.location.reload();
                        } catch (e) {
                          console.error(e);
                          window.location.reload();
                        }
                      }
                    }}
                    style={{ minHeight: '38px', padding: '0 16px', fontSize: '0.85rem' }}
                  >
                    Reset Sync
                  </button>
                )}
              </div>
            </div>
          )}
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
      <InstallPrompt />
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
