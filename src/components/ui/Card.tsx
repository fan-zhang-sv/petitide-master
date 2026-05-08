import type { ElementType, HTMLAttributes } from 'react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

type CardVariant = 'panel' | 'result' | 'section' | 'empty' | 'info' | 'plain';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: CardVariant;
  tone?: string;
}

const variantClass: Record<CardVariant, string | undefined> = {
  panel: styles['tool-panel'],
  result: styles['result-panel'],
  section: styles['section-band'],
  empty: styles['empty-state'],
  info: styles['info-card'],
  plain: undefined,
};

export function Card({
  as: Component = 'div',
  variant = 'panel',
  tone,
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cx(variantClass[variant], tone ? styles[tone] : undefined, className)}
      {...props}
    />
  );
}
