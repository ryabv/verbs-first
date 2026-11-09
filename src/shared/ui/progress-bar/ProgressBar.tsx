import styles from './ProgressBar.module.css';

interface Props {
  /** Доля выполненного, 0…1. */
  value: number;
  /** Тонкая полоска (сайдбар). */
  thin?: boolean;
}

/** Полоса прогресса — «бегущая волна»: бледный узор заполняется оливковым. */
export function ProgressBar({ value, thin }: Props) {
  const percent = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={thin ? `${styles.track} ${styles.thin}` : styles.track}
      style={{ background: `linear-gradient(to right, var(--olive) ${percent}%, var(--meander) ${percent}%)` }}
    />
  );
}
