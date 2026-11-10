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
    <div className={thin ? `${styles.track} ${styles.thin}` : styles.track}>
      {/* Заливка — отдельный слой: ширина плавно растёт (градиент так не умеет). */}
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
}
