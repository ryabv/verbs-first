import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Lesson, LessonStage } from '@/entities/lesson';
import { readExamResult } from '@/features/exam';
import {
  doneWithExam,
  isStageDone,
  readSeenAwards,
  stageDoneCount,
  stageEntryStep,
  useLessonProgress,
  writeSeenAwards,
} from '@/features/lesson-progress';
import { plural } from '@/shared/lib/plural';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { Medallion } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './LessonMap.module.css';

interface Props {
  lesson: Lesson;
  stages: LessonStage[];
  /** Ключ прогресса (progressKey.lesson). */
  storageKey: string;
  crumbs: Crumb[];
  /** Открыть шаг урока. */
  onOpenStep: (stepId: string) => void;
  /** Ссылки под заголовком: справочник урока. */
  links?: ReactNode;
  /** Экран, когда пройдены все этапы. */
  finish: { title: string; text: ReactNode; actions: ReactNode };
}

/** Высота строки дорожки, px. */
const ROW = 150;
/** Горизонтальное положение точки этапа, % ширины: дорожка петляет змейкой. */
const xOf = (i: number) => 50 + 22 * Math.sin((i * Math.PI) / 2);

/** Карта урока: этапы на нарисованной дорожке, за каждый — медальон. */
export function LessonMap({ lesson, stages, storageKey, crumbs, onOpenStep, links, finish }: Props) {
  const stepIds = useMemo(() => stages.flatMap((st) => st.steps.map((s) => s.id)), [stages]);
  const progress = useLessonProgress(storageKey, stepIds);
  // Экзамен засчитан, только если сдан (как и в пути урока).
  const examPassed = readExamResult(lesson.id)?.passed ?? false;
  const isDone = doneWithExam(stages, progress.isDone, examPassed);

  const done = stages.map((st) => isStageDone(st, isDone));
  const doneCount = done.filter(Boolean).length;
  const frontier = done.indexOf(false); // первый непройденный этап — «вы здесь»
  const allDone = frontier === -1;

  // Новые медальоны — те, что получены, но ещё не показаны: им анимация и поздравление.
  const [fresh] = useState(() => {
    const seen = new Set(readSeenAwards(lesson.id));
    return stages.filter((st, i) => done[i] && !seen.has(st.id)).map((st) => st.id);
  });
  const earnedIds = stages.filter((_, i) => done[i]).map((st) => st.id).join('|');
  useEffect(() => {
    writeSeenAwards(lesson.id, earnedIds ? earnedIds.split('|') : []);
  }, [lesson.id, earnedIds]);

  const lastFresh = stages.find((st) => st.id === fresh[fresh.length - 1]);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusId = lastFresh?.id ?? (frontier > 0 ? stages[frontier]?.id : undefined);
  useEffect(() => {
    if (!focusId) return;
    const el = nodeRefs.current[focusId];
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusId]);

  const open = (st: LessonStage) => onOpenStep(stageEntryStep(st, isDone));
  const next = allDone ? undefined : stages[frontier];
  const height = stages.length * ROW;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={crumbs} />
        <div className={styles.kicker}>Урок {lesson.id}</div>
        <h1 className={styles.title}>{lesson.title}</h1>
        <p className={styles.summary}>{lesson.summary}</p>
        <div className={styles.overall}>
          <ProgressBar value={doneCount / stages.length} thin />
          <span>
            {doneCount} из {stages.length} {plural(stages.length, ['этапа', 'этапов', 'этапов'])}
          </span>
        </div>
        {links && <div className={styles.links}>{links}</div>}
      </header>

      {lastFresh && (
        <output className={styles.award}>
          <Medallion n={lastFresh.n} earned size="4.5rem" className={styles.awardMedal} />
          <div>
            <div className={styles.awardKicker}>Новый медальон</div>
            <div className={styles.awardTitle}>{lastFresh.award}</div>
            {fresh.length > 1 && (
              <div className={styles.awardMore}>
                и ещё {fresh.length - 1} {plural(fresh.length - 1, ['медальон', 'медальона', 'медальонов'])}
              </div>
            )}
          </div>
        </output>
      )}

      {next && (
        <div className={styles.continue}>
          <Button onClick={() => open(next)}>
            {doneCount === 0 && progress.completedCount === 0 ? 'Начать урок' : `Дальше: ${next.title}`}
          </Button>
        </div>
      )}

      {allDone && (
        <Callout kind="ok" title={finish.title}>
          {finish.text}
          <div className={styles.finishActions}>
            {finish.actions}
            <Button variant="ghost" onClick={progress.reset}>
              Пройти заново
            </Button>
          </div>
        </Callout>
      )}

      <div className={styles.map} style={{ height }}>
        <svg className={styles.road} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {stages.slice(1).map((_, k) => {
            const i = k + 1;
            const x0 = xOf(i - 1);
            const y0 = (i - 1) * ROW + ROW / 2 - 20;
            const x1 = xOf(i);
            const y1 = i * ROW + ROW / 2 - 20;
            const d = `M${x0} ${y0} C${x0} ${y0 + ROW / 2} ${x1} ${y1 - ROW / 2} ${x1} ${y1}`;
            return <path key={i} d={d} className={done[i - 1] ? styles.roadDone : styles.roadTodo} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>

        <ol className={styles.nodes}>
          {stages.map((st, i) => {
            const state = done[i] ? 'done' : i === frontier ? 'current' : 'todo';
            const count = stageDoneCount(st, isDone);
            const style = { left: `${xOf(i)}%`, top: i * ROW, '--part': count / st.steps.length } as CSSProperties;
            return (
              <li key={st.id} className={`${styles.node} ${styles[state]}`} style={style}>
                <button
                  type="button"
                  ref={(el) => {
                    nodeRefs.current[st.id] = el;
                  }}
                  className={styles.nodeBtn}
                  onClick={() => open(st)}
                  aria-label={`Этап ${st.n}: ${st.title}${done[i] ? ', пройден' : ''}`}
                >
                  {state === 'current' && <span className={styles.here}>Вы здесь</span>}
                  <span className={styles.ring}>
                    <Medallion n={st.n} earned={done[i]!} size="3.6rem" className={fresh.includes(st.id) ? styles.fresh : undefined} />
                  </span>
                  <span className={styles.label}>
                    {st.kicker && <span className={styles.labelKicker}>{st.kicker}</span>}
                    <span className={styles.labelTitle}>{st.title}</span>
                    <span className={styles.labelMeta}>
                      {done[i] ? st.award : `${count} из ${st.steps.length} ${plural(st.steps.length, ['шага', 'шагов', 'шагов'])}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
