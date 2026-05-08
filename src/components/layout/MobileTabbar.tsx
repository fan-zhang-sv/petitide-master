import type { MainTab, TabConfig } from '../../types';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface MobileTabbarProps {
  activeTab: MainTab;
  tabs: TabConfig[];
  onTabChange: (id: MainTab) => void;
}

export function MobileTabbar({ activeTab, tabs, onTabChange }: MobileTabbarProps) {
  return (
    <nav className={cx(styles.tabbar, styles['mobile-only'])} aria-label="Mobile Primary">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? styles.active : ''}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon aria-hidden />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
