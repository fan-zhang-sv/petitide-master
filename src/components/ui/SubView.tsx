import type { HTMLAttributes, ReactNode } from 'react';
import styles from '../../styles/app.module.css';
import { Button } from './Button';

interface SubViewProps extends HTMLAttributes<HTMLDivElement> {
  backLabel: ReactNode;
  onBack: () => void;
}

export function SubView({ backLabel, onBack, children, ...props }: SubViewProps) {
  return (
    <div className={styles['sub-view']} {...props}>
      <header className={styles['sub-header']}>
        <Button variant="ghost" size="small" onClick={onBack}>
          {backLabel}
        </Button>
      </header>
      {children}
    </div>
  );
}
