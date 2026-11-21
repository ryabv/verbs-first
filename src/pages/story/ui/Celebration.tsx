import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import {
  chapterRank,
  STORY_CHAPTERS,
  setStoryLevel,
  STORY_LEVEL_LABELS,
  STORY_LEVELS,
  STORY_PRAISE,
  useStoryProgress,
  type StoryChapter,
  type StoryLevel,
} from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { speak } from '@/shared/lib/speech';
import { Button, buttonClassName } from '@/shared/ui/button';
import { Arrow, Laurel } from '@/shared/ui/ornament';
import { Fireworks } from './Fireworks';
import styles from './Celebration.module.css';

/** Что изменится на уровне выше — чтобы кнопка «Закрепить на …» была понятна. */
const HARDER_HINT: Partial<Record<StoryLevel, string>> = {
  medium: 'Дальше — средний уровень: та же глава, но формы вписываете сами, с подсказкой.',
  hard: 'Дальше — сложный уровень: без подсказок, только значение слова; на слух — записать.',
};

/** Глав в эпохе — по плану (docs/story/README.md); написанных может быть меньше. */
const EPOCH_SIZE = 4;

/**
 * Глава закреплена — праздник: салют, венок, «Μπράβο!» греческим голосом; если закрыта вся эпоха — об этом.
 * Сила праздника растёт с уровнем: лёгкий — коротко и скромно, средний — салют с лучами, сложный — золото и финальный залп.
 * Показывается один раз — в момент, когда сделано последнее задание уровня.
 */
export function Celebration({ chapter, level, onClose }: { chapter: StoryChapter; level: StoryLevel; onClose: () => void }) {
  const progress = useStoryProgress();
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Звук — сразу после нажатия ученика (последний ответ), браузер его пропустит.
    const t = setTimeout(() => void speak(STORY_PRAISE.greek), 900);
    // Фокус — на главное действие: Enter ведёт дальше.
    actionsRef.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Это закрепление закрыло всю эпоху (все её главы по плану) — отдельная новость.
  const epochChapters = STORY_CHAPTERS.filter((c) => c.epoch === chapter.epoch);
  const epochDone =
    epochChapters.length === EPOCH_SIZE && epochChapters.every((c) => chapterRank(c, progress[c.id] ?? {}) >= 1);
  // Следующая ступень: закрепить ту же главу строже. На сложном её нет.
  const harder = STORY_LEVELS[STORY_LEVELS.indexOf(level) + 1];
  const next = STORY_CHAPTERS.find((c) => c.id === chapter.id + 1);

  return (
    <dialog open className={`${styles.overlay} ${styles[level]}`} aria-modal="true" aria-labelledby="celebration-title">
      <Fireworks power={level} />
      <div className={styles.card}>
        {level !== 'light' && <div className={styles.rays} aria-hidden="true" />}
        <div className={styles.wreath}>
          <Laurel className={styles.laurel} size="100%" aria-hidden />
          <span className={styles.medal}>
            <span className={styles.medalNum} aria-label={`Глава ${chapter.id}`}>
              {chapter.id}
            </span>
          </span>
        </div>
        <p className={styles.praise} lang="el">
          {STORY_PRAISE.greek}
        </p>
        <p className={styles.praiseRu}>{STORY_PRAISE.russian}</p>
        <h2 id="celebration-title" className={styles.title}>
          Глава {chapter.id} закреплена
        </h2>
        {level === 'hard' && <p className={styles.summit}>Сложный уровень — высшая ступень. Без подсказок, на слух и по памяти.</p>}
        <p className={styles.level}>
          Уровень: <b>{STORY_LEVEL_LABELS[level].toLowerCase()}</b> · {chapter.practice.length} заданий
        </p>

        {epochDone && <p className={styles.epochOpen}>Эпоха {chapter.epoch} пройдена — открыта следующая!</p>}

        {harder && <p className={styles.harder}>{HARDER_HINT[harder]}</p>}
        {/* Главное действие — закрепить строже: нам важнее, чтобы ученик попробовал уровень выше. На сложном — дальше по сюжету. */}
        <div className={styles.actions} ref={actionsRef}>
          {harder && (
            <Button
              onClick={() => {
                // Смена уровня перезапускает круг заданий — праздник закрывается сам.
                setStoryLevel(harder);
                onClose();
              }}
            >
              Закрепить на {harder === 'medium' ? 'среднем' : 'сложном'} уровне <Arrow />
            </Button>
          )}
          <Link
            to={next ? routes.storyChapter(next.id) : routes.story()}
            className={buttonClassName(harder ? 'ghost' : 'primary')}
          >
            {next ? `К главе ${next.id}` : 'К истории'}
            {!harder && <Arrow />}
          </Link>
        </div>
      </div>
    </dialog>
  );
}
