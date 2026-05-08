import type { ButtonHTMLAttributes } from 'react';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

type ButtonVariant = 'primary' | 'ghost' | 'icon';
type ButtonSize = 'default' | 'small' | 'mini';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: styles['primary-button'],
  ghost: styles['ghost-button'],
  icon: styles['icon-button'],
};

const sizeClass: Record<ButtonSize, string | undefined> = {
  default: undefined,
  small: styles.small,
  mini: styles.mini,
};

export function Button({
  variant = 'ghost',
  size = 'default',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(variantClass[variant], sizeClass[size], className)}
      {...props}
    />
  );
}
