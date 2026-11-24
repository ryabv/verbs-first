import { Laurel } from '@/shared/ui/ornament';
import type { LevelRank } from '../model/progress';
import styles from './ChapterMedal.module.css';

/** Металл медальона главы по уровню закрепления (docs/product/collection.md). */
export const MEDAL_METALS = ['', 'Бронза', 'Серебро', 'Золото'] as const;
const METAL_CLASS = ['', 'bronze', 'silver', 'gold'] as const;

/**
 * Медальон главы: металлический диск в венке с номером главы — бронза, серебро или золото по уровню закрепления.
 * rank 0 — ещё не получен: пустое гнездо; `written: false` — глава ещё не написана, «?».
 * Один и тот же в «Коллекции» Профиля и на экране получения медальона.
 */
export function ChapterMedal({
  chapter,
  rank,
  written = true,
  size,
  title,
  className,
}: {
  chapter: number;
  rank: LevelRank;
  written?: boolean;
  /** Диаметр (CSS); по умолчанию — 3.4rem. */
  size?: string;
  title?: string;
  className?: string;
}) {
  const metal = METAL_CLASS[rank];
  const cls = [styles.medal, metal ? styles[metal] : styles.empty, className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={size ? { width: size, height: size, fontSize: `calc(${size} * 0.31)` } : undefined} title={title} aria-hidden={title ? undefined : true}>
      <Laurel className={styles.laurel} size="100%" />
      <span className={styles.num} aria-hidden="true">
        {written ? chapter : '?'}
      </span>
      {title && <span className={styles.srOnly}>{title}</span>}
    </span>
  );
}
