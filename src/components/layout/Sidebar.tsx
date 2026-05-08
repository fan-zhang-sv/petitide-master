import type { MainTab, TabConfig } from '../../types';
import { Eyebrow } from '../ui/Eyebrow';
import styles from '../../styles/app.module.css';

interface SidebarProps {
  activeTab: MainTab;
  tabs: TabConfig[];
  onTabChange: (id: MainTab) => void;
}

export function Sidebar({ activeTab, tabs, onTabChange }: SidebarProps) {
  return (
    <aside className={styles['desktop-sidebar']}>
      <header className={styles['brand-header']}>
        <div className={styles['brand-logo']}>PM</div>
        <div className={styles['brand-text']}>
          <Eyebrow>Local-first PWA</Eyebrow>
          <h1>Petitide Master</h1>
        </div>
      </header>
      <nav className={styles['sidebar-nav']} aria-label="Desktop Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={isActive ? styles.active : ''}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
            >
              <Icon aria-hidden />
              <span className={styles['nav-label']}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
