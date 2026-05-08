import type { HTMLAttributes } from 'react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx(styles.eyebrow, className)} {...props} />;
}
