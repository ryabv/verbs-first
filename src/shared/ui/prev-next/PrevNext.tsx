import styles from './PrevNext.module.css';

export interface NavTarget {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}

/** Две большие плашки «← предыдущий | следующий →» внизу статьи. */
export function PrevNext({ prev, next }: { prev?: NavTarget; next?: NavTarget }) {
  return (
    <nav className={styles.wrap}>
      {prev && (
        <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={prev.onClick}>
          <span className={styles.arrow}>←</span>
          <span className={styles.label}>{prev.label}</span>
          <span className={styles.title}>{prev.title}</span>
        </button>
      )}
      {next && (
        <button
          type="button"
          className={`${styles.nav} ${styles.next}`}
          onClick={next.onClick}
          disabled={next.disabled}
        >
          <span className={styles.arrow}>→</span>
          <span className={styles.label}>{next.disabled && next.hint ? next.hint : next.label}</span>
          <span className={styles.title}>{next.title}</span>
        </button>
      )}
    </nav>
  );
}
