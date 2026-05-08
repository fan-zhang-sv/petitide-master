import type { HTMLAttributes, ReactNode } from 'react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';
import { Eyebrow } from './Eyebrow';

type PageHeaderVariant = 'plain' | 'today' | 'plans' | 'catalog';

interface HeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

interface PageHeaderProps extends HeaderProps {
  variant?: PageHeaderVariant;
}

const pageHeaderClass: Record<PageHeaderVariant, string> = {
  plain: styles['section-heading'],
  today: styles['today-header'],
  plans: styles['plans-topline'],
  catalog: styles['catalog-topline'],
};

export function SectionHeader({
  title,
  eyebrow,
  meta,
  actions,
  className,
  children,
  ...props
}: HeaderProps) {
  return (
    <div className={cx(styles['section-heading'], className)} {...props}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2>{title}</h2>
        {meta && <span>{meta}</span>}
      </div>
      {actions}
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow,
  meta,
  actions,
  className,
  children,
  variant = 'plain',
  ...props
}: PageHeaderProps) {
  return (
    <header className={cx(pageHeaderClass[variant], className)} {...props}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2>{title}</h2>
        {meta && <p>{meta}</p>}
      </div>
      {actions}
      {children}
    </header>
  );
}
