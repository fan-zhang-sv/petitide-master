import type { ReactNode } from 'react';
import styles from '../../styles/app.module.css';

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className={styles['form-grid']}>{children}</div>;
}
