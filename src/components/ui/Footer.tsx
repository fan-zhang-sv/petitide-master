import type { HTMLAttributes, ReactNode } from 'react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface FooterProps extends HTMLAttributes<HTMLElement> {
  meta?: ReactNode;
}

export function Footer({ meta, className, children, ...props }: FooterProps) {
  return (
    <footer className={cx(styles['app-footer'], className)} {...props}>
      {children ?? meta}
    </footer>
  );
}
