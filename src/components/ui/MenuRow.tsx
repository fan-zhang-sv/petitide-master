import type { ButtonHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface MenuRowContentProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
}

interface MenuRowButtonProps
  extends MenuRowContentProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  as?: 'button';
  danger?: boolean;
}

interface MenuRowLabelProps
  extends MenuRowContentProps,
    Omit<LabelHTMLAttributes<HTMLLabelElement>, 'title'> {
  as: 'label';
  danger?: boolean;
}

type MenuRowProps = MenuRowButtonProps | MenuRowLabelProps;

export function MenuRow(props: MenuRowProps) {
  const {
    as = 'button',
    icon,
    title,
    description,
    trailing,
    danger,
    className,
    children,
    ...rest
  } = props;
  const content = (
    <>
      <div className={styles['menu-icon']}>{icon}</div>
      <div className={styles['menu-info']}>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {trailing ?? <ChevronRight aria-hidden className={styles['menu-chevron']} />}
      {children}
    </>
  );
  const rowClassName = cx(styles['menu-row'], danger ? styles.danger : undefined, className);

  if (as === 'label') {
    return (
      <label className={cx(rowClassName, styles.clickable)} {...(rest as LabelHTMLAttributes<HTMLLabelElement>)}>
        {content}
      </label>
    );
  }

  return (
    <button type="button" className={rowClassName} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}
