import type { HTMLAttributes } from 'react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: string;
}

export function Pill({ tone, className, ...props }: BadgeProps) {
  return <span className={cx(styles.pill, tone ? styles[tone] : undefined, className)} {...props} />;
}

export function StatusLabel({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cx(styles['status-label'], styles[tone], className)} {...props} />;
}
