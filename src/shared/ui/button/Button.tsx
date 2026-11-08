import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

/** Классы кнопки — чтобы оформить ссылку как кнопку, не вкладывая <button> в <a>. */
export function buttonClassName(variant: Variant = 'primary', extra?: string): string {
  return [styles.button, styles[variant], extra].filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
