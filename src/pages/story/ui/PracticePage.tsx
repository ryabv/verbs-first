import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  chapterRank,
  levelRank,
  markStoryStep,
  practiceKey,
  PRACTICE_KINDS,
  STORY_CHAPTERS,
  STORY_LEVEL_LABELS,
  STORY_LEVELS,
  TASK_SKILL_LABELS,
  useStoryLevel,
  useStoryLevels,
  type PracticeTask as PracticeTaskData,
  type StoryChapter,
} from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { logAttempt } from '@/shared/lib/db';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button, buttonClassName } from '@/shared/ui/button';
import { Arrow, Check } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { Celebration } from './Celebration';
import { LevelSwitch } from './LevelSwitch';
import { PracticeTask } from './PracticeTask';
import styles from './Story.module.css';

/** /story/:id/practice — закрепление главы: задания одно за другим на выбранном уровне. */
export function PracticePage({ chapter }: { chapter: StoryChapter }) {
  const level = useStoryLevel();
  const [params, setParams] = useSearchParams();
  // Только для разработки: ?celebrate=light|medium|hard — посмотреть праздник, не решая задания.
  const preview = process.env.NODE_ENV !== 'production' ? STORY_LEVELS.find((l) => l === params.get('celebrate')) : undefined;
  return (
    <>
      {preview && <Celebration chapter={chapter} level={preview} onClose={() => setParams({})} />}
      {/* Смена уровня — новый круг заданий. */}
      <Practice key={level} chapter={chapter} />
    </>
  );
}

function Practice({ chapter }: { chapter: StoryChapter }) {
  const level = useStoryLevel();
  const levels = useStoryLevels(chapter.id);
  const rank = levelRank(level);
  const isDone = (t: PracticeTaskData) => (levels[practiceKey(t)] ?? 0) >= rank;

  // Круг: сначала несделанное на этом уровне; если всё сделано — все задания заново.
  const [queue, setQueue] = useState(() => {
    const left = chapter.practice.filter((t) => !isDone(t));
    return left.length > 0 ? left : chapter.practice;
  });
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const task = queue[index];
  // Праздник — только в момент, когда уровень закрыт впервые; повторный круг его не вызывает.
  const [completeAtStart] = useState(() => chapter.practice.every(isDone));
  const [celebrate, setCelebrate] = useState(false);
  const closeCelebration = useCallback(() => setCelebrate(false), []);

  const log = (result: 'right' | 'revealed' | 'skipped') =>
    task && logAttempt({ source: 'story-practice', item: `${chapter.id}:${task.id}`, kind: task.kind, level, result });

  const solve = () => {
    if (!task) return;
    setSolved(true);
    log('right');
    markStoryStep(chapter.id, practiceKey(task), level);
    // Пауза — чтобы ученик успел увидеть «Верно» на последнем задании.
    if (!completeAtStart && chapter.practice.every((t) => t.id === task.id || isDone(t))) setTimeout(() => setCelebrate(true), 700);
  };
  const reveal = () => {
    if (!task) return;
    setSolved(true);
    log('revealed');
    setRevealed((r) => new Set(r).add(task.id));
  };
  const next = () => {
    setSolved(false);
    setIndex((i) => i + 1);
  };
  const again = () => {
    setQueue(chapter.practice.filter((t) => !isDone(t)));
    setIndex(0);
    setSolved(false);
    setRevealed(new Set());
  };

  const nextChapter = useMemo(() => STORY_CHAPTERS.find((c) => c.id === chapter.id + 1), [chapter.id]);
  const doneCount = chapter.practice.filter((t) => isDone(t)).length;

  return (
    <div className={styles.page}>
      {celebrate && <Celebration chapter={chapter} level={level} onClose={closeCelebration} />}
      <header className={styles.head}>
        <Breadcrumbs
          items={[
            { label: 'История', to: routes.story() },
            { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
            { label: 'Закрепление' },
          ]}
        />
        <p className={styles.kicker}>Закрепление главы {chapter.id}</p>
        <p className={styles.lead}>
          Задания по тексту главы: чтение, слушание, письмо. Уровень можно сменить в любой момент — сделанное на сложном засчитано и на
          лёгком.
        </p>
        <LevelSwitch passed={chapterRank(chapter, levels)} className={styles.chapterLevels} />
        <div className={styles.chapterProgress}>
          <ProgressBar value={doneCount / chapter.practice.length} />
          <span>
            {STORY_LEVEL_LABELS[level]}: {doneCount}/{chapter.practice.length}
          </span>
        </div>
      </header>

      {task ? (
        <section className={styles.task}>
          <div className={styles.taskHead}>
            <h2 className={styles.taskTitle}>
              {TASK_SKILL_LABELS[PRACTICE_KINDS[task.kind].skill]} · {index + 1} из {queue.length}
            </h2>
            {!solved && (
              <button type="button" className={styles.linkBtn} onClick={reveal}>
                Показать ответ
              </button>
            )}
          </div>
          <PracticeTask key={task.id} chapter={chapter} task={task} level={level} solved={solved} onSolved={solve} />
          {revealed.has(task.id) && <p className={styles.gapHint}>Ответ показан — это задание вернётся в следующий круг.</p>}
          <div className={styles.stepNav}>
            {solved ? (
              <Button onClick={next}>
                Дальше <Arrow />
              </Button>
            ) : (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  log('skipped');
                  next();
                }}
              >
                Пропустить
              </button>
            )}
          </div>
        </section>
      ) : (
        <Finish
          chapter={chapter}
          left={chapter.practice.length - doneCount}
          rank={chapterRank(chapter, levels)}
          onAgain={again}
          next={nextChapter}
        />
      )}
    </div>
  );
}

function Finish({
  chapter,
  left,
  rank,
  onAgain,
  next,
}: {
  chapter: StoryChapter;
  left: number;
  rank: number;
  onAgain: () => void;
  next?: StoryChapter;
}) {
  const level = useStoryLevel();
  return (
    <section className={styles.summary}>
      {left === 0 ? (
        <h2>
          <Check /> Глава закреплена: {STORY_LEVEL_LABELS[level].toLowerCase()} уровень
        </h2>
      ) : (
        <>
          <h2>Круг пройден</h2>
          <p>
            Осталось заданий на этом уровне: {left}. Те, где показан ответ или которые пропущены, можно сделать ещё раз.
          </p>
        </>
      )}
      {rank > 0 && left === 0 && <p>Попробуйте уровень сложнее — текст тот же, задания строже.</p>}
      <div className={styles.finishRow}>
        {left > 0 && <Button onClick={onAgain}>Ещё круг</Button>}
        {next ? (
          <Link to={routes.storyChapter(next.id)} className={buttonClassName(left > 0 ? 'secondary' : 'primary')}>
            К главе {next.id} <Arrow />
          </Link>
        ) : (
          <Link to={routes.story()} className={buttonClassName(left > 0 ? 'secondary' : 'primary')}>
            К истории <Arrow />
          </Link>
        )}
        <Link to={routes.storyChapter(chapter.id)}>
          <Arrow direction="left" /> К главе {chapter.id}
        </Link>
      </div>
    </section>
  );
}
