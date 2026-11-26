import { useId } from 'react';
import { levelRank, MEDAL_METALS, STORY_LEVEL_LABELS, STORY_LEVELS, type LevelRank, type StoryLevel } from '@/entities/story';
import { Laurel } from '@/shared/ui/ornament';
import styles from './LevelBadge.module.css';

const HINTS = {
  light: 'выбираете ответ из вариантов',
  medium: 'вписываете сами, с подсказкой',
  hard: 'вписываете сами, подсказка — только значение по-русски; на слух — диктант',
} as const;

const METAL = { light: 'bronze', medium: 'silver', hard: 'gold' } as const;

/** Значок уровня — маленький медальон того металла, который даёт уровень: бронза, серебро, золото. */
function LevelIcon({ level }: { level: StoryLevel }) {
  return (
    <svg className={`${styles.icon} ${styles[METAL[level]]}`} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" className={styles.coinEdge} />
      <circle cx="8" cy="8" r="5.6" className={styles.coin} />
      <circle cx="8" cy="8" r="3.6" className={styles.coinRing} />
    </svg>
  );
}

/**
 * Уровень на странице заданий — маленький значок; подробности — при наведении или нажатии (подсказка).
 * Уровень не выбирают — он идёт от прогресса (docs/product/modes.md). `passed` — до какого уровня глава уже пройдена.
 */
export function LevelBadge({ level, passed = 0 }: { level: StoryLevel; passed?: LevelRank }) {
  const tip = useId();
  const next = STORY_LEVELS[STORY_LEVELS.indexOf(level) + 1];
  return (
    <span className={styles.badge}>
      <button type="button" className={styles.badgeBtn} aria-describedby={tip} aria-label={`Уровень: ${STORY_LEVEL_LABELS[level].toLowerCase()}`}>
        <LevelIcon level={level} />
      </button>
      <span role="tooltip" id={tip} className={styles.tip}>
        <b>Уровень: {STORY_LEVEL_LABELS[level].toLowerCase()}</b> — {HINTS[level]}. Медальон — {MEDAL_METALS[levelRank(level)].toLowerCase()}.
        <span className={styles.tipLine}>
          {STORY_LEVELS.map((l, i) => (
            <span key={l}>
              {i > 0 && ' → '}
              {passed >= levelRank(l) && <Laurel className={styles.levelLaurel} aria-label="пройден" />}
              {l === level ? <b>{STORY_LEVEL_LABELS[l]}</b> : STORY_LEVEL_LABELS[l]}
            </span>
          ))}
        </span>
        {next && <span className={styles.tipLine}>Пройдёте — глава продолжится на уровне «{STORY_LEVEL_LABELS[next].toLowerCase()}».</span>}
      </span>
    </span>
  );
}
