import { useId } from 'react';
import { levelRank, setStoryLevel, STORY_LEVEL_LABELS, STORY_LEVELS, useStoryLevel, type LevelRank } from '@/entities/story';
import { Laurel } from '@/shared/ui/ornament';
import styles from './Story.module.css';

const HINTS = {
  light: 'выбираете ответ из вариантов',
  medium: 'вписываете сами, с подсказкой',
  hard: 'вписываете без подсказок, на слух — диктант',
} as const;

/**
 * Уровень истории — один на все главы, запоминается. passed — уровень, на котором глава уже пройдена:
 * у этого уровня и всех полегче — венок (сложный засчитывает и лёгкий).
 */
export function LevelSwitch({ passed = 0, className }: { passed?: LevelRank; className?: string }) {
  const level = useStoryLevel();
  const name = useId();
  return (
    <fieldset className={className ? `${styles.levels} ${className}` : styles.levels}>
      <legend className={styles.levelsLegend}>Уровень</legend>
      <div className={styles.levelOptions}>
        {STORY_LEVELS.map((l) => {
          const done = passed >= levelRank(l);
          return (
            <label key={l} className={l === level ? `${styles.levelOption} ${styles.levelOn}` : styles.levelOption} title={HINTS[l]}>
              <input type="radio" name={name} value={l} checked={l === level} onChange={() => setStoryLevel(l)} />
              {done && <Laurel className={styles.levelLaurel} aria-label="пройден" />}
              {STORY_LEVEL_LABELS[l]}
            </label>
          );
        })}
      </div>
      <p className={styles.levelHint}>{HINTS[level]}</p>
    </fieldset>
  );
}
