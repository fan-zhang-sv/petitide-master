import type { MainTab, TabConfig } from '../../types';

interface MobileTabbarProps {
  activeTab: MainTab;
  tabs: TabConfig[];
  onTabChange: (id: MainTab) => void;
}

export function MobileTabbar({ activeTab, tabs, onTabChange }: MobileTabbarProps) {
  return (
    <nav className="tabbar mobile-only" aria-label="Mobile Primary">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || (tab.id === 'tools' && ['dose-math', 'settings'].includes(activeTab));
        
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? 'active' : ''}
            onClick={() => {
              if (tab.id === 'tools') {
                if (activeTab === 'settings') onTabChange('settings');
                else if (activeTab === 'dose-math') onTabChange('dose-math');
                else onTabChange('tools');
              } else {
                onTabChange(tab.id);
              }
            }}
          >
            <Icon aria-hidden />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
