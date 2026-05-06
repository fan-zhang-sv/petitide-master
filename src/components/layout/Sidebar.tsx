import type { MainTab, TabConfig } from '../../types';

interface SidebarProps {
  activeTab: MainTab;
  tabs: TabConfig[];
  onTabChange: (id: MainTab) => void;
}

export function Sidebar({ activeTab, tabs, onTabChange }: SidebarProps) {
  return (
    <aside className="desktop-sidebar">
      <header className="brand-header">
        <div className="brand-logo">PM</div>
        <div className="brand-text">
          <p className="eyebrow">Local-first PWA</p>
          <h1>Petitide Master</h1>
        </div>
      </header>
      <nav className="sidebar-nav" aria-label="Desktop Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'dose-math' && activeTab === 'tools');
          return (
            <button
              key={tab.id}
              type="button"
              className={isActive ? 'active' : ''}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
            >
              <Icon aria-hidden />
              <span className="nav-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
