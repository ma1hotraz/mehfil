import type { ComponentProps, ReactNode } from 'react';

import { cx } from '../lib/cx';

import styles from './Button.module.css';
import { Icon, type IconName } from './Icon';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'text';
  icon?: IconName;
  children: ReactNode;
}

/** Square-cornered button: primary (vermilion fill), secondary (ink outline) or text link style. */
export function Button({
  variant = 'secondary',
  icon,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(styles.button, styles[variant], className)} {...rest}>
      <span>{children}</span>
      {icon ? <Icon name={icon} /> : null}
    </button>
  );
}
