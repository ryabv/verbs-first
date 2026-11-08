import type { ReactNode } from 'react';
import styles from './Callout.module.css';

type Kind = 'smart' | 'warn' | 'ok';

const ICONS: Record<Kind, string> = { smart: 'i', warn: '!', ok: '✓' };

interface Props {
  kind?: Kind;
  title?: string;
  children: ReactNode;
}

/** Блок-заметка с рамкой — аналог .important на learn.javascript.ru. */
export function Callout({ kind = 'smart', title, children }: Props) {
  return (
    <div className={`${styles.callout} ${styles[kind]}`}>
      {title && (
        <div className={styles.header}>
          <span className={styles.icon}>{ICONS[kind]}</span>
          {title}
        </div>
      )}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
