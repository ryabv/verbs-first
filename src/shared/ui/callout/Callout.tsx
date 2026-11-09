import type { ReactNode } from 'react';
import { Column, Laurel } from '../ornament';
import styles from './Callout.module.css';

type Kind = 'smart' | 'warn' | 'ok';

/** Греческие мотивы: колонна — справка, венок — успех; предупреждение — знак «!», чтобы читалось сразу. */
function Icon({ kind }: { kind: Kind }) {
  if (kind === 'smart') return <Column className={styles.motif} size="1.5rem" />;
  if (kind === 'ok') return <Laurel className={styles.motif} size="1.5rem" />;
  return <span className={styles.icon}>!</span>;
}

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
          <Icon kind={kind} />
          {title}
        </div>
      )}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
