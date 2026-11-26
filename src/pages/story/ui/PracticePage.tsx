import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  chapterLevel,
  chapterRank,
  levelRank,
  markStoryStep,
  practiceKey,
  PRACTICE_KINDS,
  STORY_CHAPTERS,
  STORY_LEVEL_LABELS,
  STORY_LEVELS,
  TASK_SKILL_LABELS,
  useStoryLevels,
  type PracticeTask as PracticeTaskData,
  type StoryChapter,
  type StoryLevel,
} from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { logAttempt } from '@/shared/lib/db';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button, buttonClassName } from '@/shared/ui/button';
import { Arrow, Check } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { LevelBadge, PracticeTask } from '@/widgets/practice-task';
import { Celebration } from './Celebration';
import styles from './Story.module.css';

/** Сколько верных ответов подряд — и следующее задание на уровень выше. */
const STRETCH_AFTER = 3;

/**
 * /story/:id/practice — закрепление главы: задания одно за другим. Уровень — первый не пройденный у главы
 * (`chapterLevel`, docs/product/modes.md). Пройден уровень — праздник, дальше — следующий уровень.
 */
export function PracticePage({ chapter }: { chapter: StoryChapter }) {
  const levels = useStoryLevels(chapter.id);
  const current = chapterLevel(chapter, levels);
  // Уровень круга держим, пока ученик не решит идти дальше: иначе пройденный уровень сменился бы посреди праздника.
  const [level, setLevel] = useState(current);
  // Смена уровня — новый круг заданий.
  return (
    <Practice
      key={level}
      chapter={chapter}
      level={level}
      nextLevel={current !== level ? current : undefined}
      onNextLevel={() => setLevel(current)}
      onEasier={setLevel}
    />
  );
}

function Practice({
  chapter,
  level,
  nextLevel,
  onNextLevel,
  onEasier,
}: {
  chapter: StoryChapter;
  level: StoryLevel;
  /** Уровень пройден — на какой глава идёт дальше. */
  nextLevel?: StoryLevel;
  onNextLevel: () => void;
  /** Шаг назад: круг на уровне полегче. */
  onEasier: (level: StoryLevel) => void;
}) {
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
  // Задание посложнее (docs/product/modes.md): после STRETCH_AFTER верных подряд — следующее на уровень выше.
  const harder = STORY_LEVELS[STORY_LEVELS.indexOf(level) + 1];
  const [streak, setStreak] = useState(0);
  const [stretch, setStretch] = useState(false);
  const taskLevel = stretch && harder ? harder : level;
  // Праздник — только в момент, когда уровень закрыт впервые; повторный круг его не вызывает.
  const [completeAtStart] = useState(() => chapter.practice.every(isDone));
  // Уровень главы до закрепления — медальон «перековывается» с него (бронза → серебро → золото).
  const [rankAtStart] = useState(() => chapterRank(chapter, levels));
  const [celebrate, setCelebrate] = useState(false);
  const closeCelebration = useCallback(() => setCelebrate(false), []);

  const log = (result: 'right' | 'revealed' | 'skipped') =>
    task && logAttempt({ source: 'story-practice', item: `${chapter.id}:${task.id}`, kind: task.kind, level: taskLevel, result });

  const solve = () => {
    if (!task) return;
    setSolved(true);
    log('right');
    markStoryStep(chapter.id, practiceKey(task), taskLevel);
    // После задания посложнее счёт — заново: такие задания редкие, не через одно.
    setStreak((s) => (stretch ? 0 : s + 1));
    // Пауза — чтобы ученик успел увидеть «Верно» на последнем задании.
    if (!completeAtStart && chapter.practice.every((t) => t.id === task.id || isDone(t))) setTimeout(() => setCelebrate(true), 700);
  };
  const reveal = () => {
    if (!task) return;
    setSolved(true);
    log('revealed');
    setStreak(0);
    setRevealed((r) => new Set(r).add(task.id));
  };
  const next = () => {
    setStretch(harder !== undefined && streak >= STRETCH_AFTER);
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
      {celebrate && <Celebration chapter={chapter} level={level} fromRank={rankAtStart} onClose={closeCelebration} onNextLevel={onNextLevel} />}
      <header className={styles.head}>
        <Breadcrumbs
          items={[
            { label: 'История', to: routes.story() },
            { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
            { label: 'Закрепление' },
          ]}
        />
        <p className={styles.kicker}>Закрепление главы {chapter.id}</p>
        <p className={styles.lead}>Задания по тексту главы: чтение, слушание, письмо.</p>
        <div className={styles.chapterProgress}>
          <ProgressBar value={doneCount / chapter.practice.length} />
          <span>
            {doneCount}/{chapter.practice.length}
          </span>
          <LevelBadge level={level} passed={chapterRank(chapter, levels)} />
        </div>
      </header>

      {task ? (
        <section className={styles.task}>
          <div className={styles.taskHead}>
            <h2 className={styles.taskTitle}>
              {TASK_SKILL_LABELS[PRACTICE_KINDS[task.kind].skill]} · {index + 1} из {queue.length}
              {taskLevel !== level && (
                <span className={styles.stretch} title={`Вы отвечаете уверенно — это задание на уровне «${STORY_LEVEL_LABELS[taskLevel].toLowerCase()}». Не выйдет — не страшно.`}>
                  Посложнее
                </span>
              )}
            </h2>
            {!solved && (
              <button type="button" className={styles.linkBtn} onClick={reveal}>
                Показать ответ
              </button>
            )}
          </div>
          <PracticeTask key={`${task.id}:${taskLevel}`} sentences={chapter.sentences} task={task} level={taskLevel} solved={solved} onSolved={solve} />
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
                  setStreak(0);
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
          level={level}
          nextLevel={nextLevel}
          onNextLevel={onNextLevel}
          onEasier={onEasier}
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
  level,
  nextLevel,
  onNextLevel,
  onEasier,
  onAgain,
  next,
}: {
  chapter: StoryChapter;
  left: number;
  level: StoryLevel;
  nextLevel?: StoryLevel;
  onNextLevel: () => void;
  onEasier: (level: StoryLevel) => void;
  onAgain: () => void;
  next?: StoryChapter;
}) {
  // Шаг назад: на уровне выше лёгкого много заданий осталось с показанным ответом или пропущено — трудность непосильная.
  const easier = STORY_LEVELS[STORY_LEVELS.indexOf(level) - 1];
  const struggling = easier !== undefined && left >= Math.max(3, Math.ceil(chapter.practice.length / 3));
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
          {struggling && <p>Можно сначала пройти главу полегче — потом она снова позовёт на этот уровень.</p>}
        </>
      )}
      {nextLevel && left === 0 && <p>Дальше — {STORY_LEVEL_LABELS[nextLevel].toLowerCase()} уровень: текст тот же, задания строже.</p>}
      <div className={styles.finishRow}>
        {left > 0 && <Button onClick={onAgain}>Ещё круг</Button>}
        {struggling && (
          <Button variant="secondary" onClick={() => onEasier(easier)}>
            Попробовать на {easier === 'light' ? 'лёгком' : 'среднем'} уровне
          </Button>
        )}
        {nextLevel && left === 0 && (
          <Button onClick={onNextLevel}>
            Закрепить на {nextLevel === 'medium' ? 'среднем' : 'сложном'} уровне <Arrow />
          </Button>
        )}
        {next ? (
          <Link to={routes.storyChapter(next.id)} className={buttonClassName(left > 0 || nextLevel ? 'secondary' : 'primary')}>
            К главе {next.id} <Arrow />
          </Link>
        ) : (
          <Link to={routes.story()} className={buttonClassName(left > 0 || nextLevel ? 'secondary' : 'primary')}>
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
