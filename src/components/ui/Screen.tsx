import type { HTMLAttributes } from 'react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

export function Screen({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx(styles.screen, className)} {...props} />;
}
