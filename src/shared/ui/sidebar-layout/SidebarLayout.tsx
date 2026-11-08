import type { ReactNode } from 'react';
import styles from './SidebarLayout.module.css';

interface Props {
  sidebar: ReactNode;
  children: ReactNode;
}

/** Серый сайдбар слева + колонка статьи (как в учебнике learn.javascript.ru). */
export function SidebarLayout({ sidebar, children }: Props) {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>{sidebar}</div>
      </aside>
      <div className={styles.main}>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

/** Заголовок секции сайдбара: серый, мелкий. */
export function SidebarSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      {children}
    </section>
  );
}
