import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  ChapterMedal,
  chapterRank,
  levelRank,
  MEDAL_METALS,
  STORY_CHAPTERS,
  setStoryLevel,
  STORY_LEVEL_LABELS,
  STORY_LEVELS,
  STORY_PRAISE,
  useStoryProgress,
  type LevelRank,
  type StoryChapter,
  type StoryLevel,
} from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { speak } from '@/shared/lib/speech';
import { Button, buttonClassName } from '@/shared/ui/button';
import { Arrow } from '@/shared/ui/ornament';
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
 * Глава закреплена — получение медальона (docs/product/collection.md), как черепок у ежедневных: тёплая тьма, лучи,
 * салют, «Μπράβο!» греческим голосом; медальон главы поднимается с вращением и вспыхивает. Уровень выше прежнего —
 * медальон перековывается (на развороте прежний металл сменяется новым). Одна кнопка «Забрать» — медальон уходит
 * в «Коллекцию», дальше карточка с выбором: закрепить строже или к следующей главе.
 * Сила праздника растёт с уровнем. Показывается один раз — в момент, когда сделано последнее задание уровня.
 * `fromRank` — уровень главы до последнего задания (0 — медальона не было).
 */
export function Celebration({
  chapter,
  level,
  fromRank,
  onClose,
}: {
  chapter: StoryChapter;
  level: StoryLevel;
  fromRank: LevelRank;
  onClose: () => void;
}) {
  const progress = useStoryProgress();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [taken, setTaken] = useState(false);
  const rank = levelRank(level);
  const upgrade = fromRank > 0 && fromRank < rank;

  useEffect(() => {
    // Звук — сразу после нажатия ученика (последний ответ), браузер его пропустит. Один раз — на получении медальона.
    const t = setTimeout(() => void speak(STORY_PRAISE.greek), 900);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    // Фокус — на главное действие («Забрать», потом — выбор дальше): Enter ведёт дальше. Esc — забрать / закрыть.
    actionsRef.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (taken ? onClose() : setTaken(true));
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, taken]);

  // Это закрепление закрыло всю эпоху (все её главы по плану) — отдельная новость.
  const epochChapters = STORY_CHAPTERS.filter((c) => c.epoch === chapter.epoch);
  const epochDone =
    epochChapters.length === EPOCH_SIZE && epochChapters.every((c) => chapterRank(c, progress[c.id] ?? {}) >= 1);
  // Следующая ступень: закрепить ту же главу строже. На сложном её нет.
  const harder = STORY_LEVELS[STORY_LEVELS.indexOf(level) + 1];
  const next = STORY_CHAPTERS.find((c) => c.id === chapter.id + 1);

  if (!taken) {
    const metal = MEDAL_METALS[rank];
    return (
      <dialog open className={`${styles.reveal} ${styles[level]}`} aria-modal="true" aria-labelledby="celebration-title">
        <Fireworks power={level} />
        <div className={styles.revealRays} aria-hidden="true" />
        <div className={styles.stage}>
          {/* Монета взлетает и крутится; при перековке — встаёт ребром, и прежний металл сменяется новым. */}
          <div className={upgrade ? `${styles.coin} ${styles.coinUpgrade}` : styles.coin}>
            <div className={styles.forge}>
              {upgrade && <ChapterMedal chapter={chapter.id} rank={fromRank} className={`${styles.face} ${styles.old}`} size="min(42vw, 11rem)" />}
              <ChapterMedal chapter={chapter.id} rank={rank} className={`${styles.face} ${styles.new}`} size="min(42vw, 11rem)" />
            </div>
          </div>
          <span className={styles.flash} aria-hidden="true" />
        </div>
        <div className={styles.revealText} ref={actionsRef}>
          <p className={styles.revealKicker}>Коллекция · Эпоха {chapter.epoch}</p>
          <p className={styles.revealPraise} lang="el">
            {STORY_PRAISE.greek}
          </p>
          <h2 id="celebration-title" className={styles.revealTitle}>
            Медальон главы {chapter.id}
          </h2>
          <p className={styles.revealMetal}>
            {upgrade ? `${MEDAL_METALS[fromRank]} → ${metal.toLowerCase()}` : metal}: глава закреплена на уровне «{STORY_LEVEL_LABELS[level].toLowerCase()}»
          </p>
          {epochDone && <p className={styles.revealEpoch}>Эпоха {chapter.epoch} пройдена — открыта следующая!</p>}
          <button type="button" className={styles.take} onClick={() => setTaken(true)}>
            Забрать
          </button>
        </div>
      </dialog>
    );
  }

  return (
    <dialog open className={`${styles.overlay} ${styles[level]}`} aria-modal="true" aria-labelledby="celebration-title">
      <Fireworks power={level} />
      <div className={styles.card}>
        {level !== 'light' && <div className={styles.rays} aria-hidden="true" />}
        <div className={styles.wreath}>
          <ChapterMedal chapter={chapter.id} rank={rank} size="100cqi" />
        </div>
        <h2 id="celebration-title" className={styles.title}>
          Глава {chapter.id} закреплена
        </h2>
        {level === 'hard' && <p className={styles.summit}>Сложный уровень — высшая ступень. Формы пишете сами, без подсказок, а услышанное записываете.</p>}
        <p className={styles.level}>
          Уровень: <b>{STORY_LEVEL_LABELS[level].toLowerCase()}</b> · {chapter.practice.length} заданий
        </p>

        <p className={styles.collection}>
          Медальон — в <Link to={routes.profile()}>Коллекции</Link>
        </p>

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
