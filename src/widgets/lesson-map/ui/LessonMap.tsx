import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { LessonStage } from '@/entities/lesson';
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
import { Owl, StageMark } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './LessonMap.module.css';

interface Props {
  /** Что за курс: id (он же id экзамена и медальонов), надпись над названием, название, описание. */
  course: { id: number | string; kicker: string; title: string; summary: string };
  stages: LessonStage[];
  /** Необязательные ответвления (lessonBranches): пунктирные тропинки в сторону от этапов. */
  branches: LessonStage[];
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

/** Вид знака точки: медальон темы, табличка ДЗ, храм экзамена. */
const markKind = (st: LessonStage) => (st.section === 'homework' ? 'homework' : st.section === 'exam' ? 'exam' : 'lesson');

/** Высота строки дорожки, px. */
const ROW = 158;
/** Центр медальона от верха строки, px (кольцо 4.4rem). */
const MEDAL_Y = 35;
/** Горизонтальное положение точки этапа, % ширины: дорожка петляет змейкой. */
const xOf = (i: number) => 50 + 22 * Math.sin((i * Math.PI) / 2);

/** Карта урока: этапы на нарисованной дорожке, за каждый — медальон. */
export function LessonMap({ course, stages, branches, storageKey, crumbs, onOpenStep, links, finish }: Props) {
  const stepIds = useMemo(() => stages.flatMap((st) => st.steps.map((s) => s.id)), [stages]);
  const progress = useLessonProgress(storageKey, stepIds);
  // Экзамен засчитан, только если сдан (как и в пути урока).
  const examPassed = readExamResult(course.id)?.passed ?? false;
  const isDone = doneWithExam(stages, progress.isDone, examPassed);

  const done = stages.map((st) => isStageDone(st, isDone));
  const doneCount = done.filter(Boolean).length;
  const frontier = done.indexOf(false); // первый непройденный этап — «вы здесь»
  const allDone = frontier === -1;

  // Новые медальоны — те, что получены, но ещё не показаны: им анимация и поздравление.
  const [fresh] = useState(() => {
    const seen = new Set(readSeenAwards(course.id));
    return stages.filter((st, i) => done[i] && !seen.has(st.id)).map((st) => st.id);
  });
  const earnedIds = stages.filter((_, i) => done[i]).map((st) => st.id).join('|');
  useEffect(() => {
    writeSeenAwards(course.id, earnedIds ? earnedIds.split('|') : []);
  }, [course.id, earnedIds]);

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

  // Ответвление отходит от своего этапа в сторону — туда, где нет соседней точки дорожки.
  const branchNodes = branches.flatMap((br) => {
    const i = stages.findIndex((st) => st.id === br.parent);
    if (i === -1) return [];
    const xs = xOf(i);
    const side = xs > 50 ? -1 : xs < 50 ? 1 : xOf(i + 1) > 50 ? -1 : 1;
    return [{ br, i, xs, xb: side < 0 ? 13 : 87, done: isStageDone(br, progress.isDone) }];
  });
  const branchesDone = branchNodes.filter((b) => b.done).length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={crumbs} />
        <div className={styles.kicker}>{course.kicker}</div>
        <h1 className={styles.title}>{course.title}</h1>
        <p className={styles.summary}>{course.summary}</p>
        <div className={styles.overall}>
          <ProgressBar value={doneCount / stages.length} thin />
          <span>
            {doneCount} из {stages.length} {plural(stages.length, ['этапа', 'этапов', 'этапов'])}
          </span>
        </div>
        {branchNodes.length > 0 && (
          <div className={styles.branchesNote}>
            <Owl /> Ответвления — необязательно, для любопытных: {branchesDone} из {branchNodes.length}
          </div>
        )}
        {links && <div className={styles.links}>{links}</div>}
      </header>

      {lastFresh && (
        <output className={styles.award}>
          <StageMark kind={markKind(lastFresh)} num={lastFresh.num} earned size="4.5rem" className={styles.awardMedal} />
          <div>
            <div className={styles.awardKicker}>
              {lastFresh.section === 'homework' ? 'Домашнее задание' : lastFresh.section === 'exam' ? 'Экзамен сдан' : 'Новый медальон'}
            </div>
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
          {branchNodes.map(({ br, i, xs, xb, done: bd }) => {
            const y = i * ROW + MEDAL_Y;
            const d = `M${xs} ${y} Q${(xs + xb) / 2} ${y + 26} ${xb} ${y}`;
            return <path key={br.id} d={d} className={bd ? styles.branchDone : styles.branchTodo} vectorEffect="non-scaling-stroke" />;
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
                  aria-label={`${st.kicker ?? `Этап ${st.num}`}: ${st.title}${done[i] ? ', пройден' : ''}`}
                >
                  {state === 'current' && <span className={styles.here}>Вы здесь</span>}
                  <span className={styles.ring}>
                    <StageMark
                      kind={markKind(st)}
                      num={st.num}
                      earned={done[i]!}
                      size="3.6rem"
                      className={fresh.includes(st.id) ? styles.fresh : undefined}
                    />
                  </span>
                  <span className={styles.label}>
                    {st.kicker && <span className={styles.labelKicker}>{st.kicker}</span>}
                    <span className={styles.labelTitle}>{st.title}</span>
                    <span className={styles.labelMeta}>
                      {done[i]
                        ? st.award
                        : st.section === 'exam'
                          ? 'сдать от 80%'
                          : `${count} из ${st.steps.length} ${plural(st.steps.length, ['шага', 'шагов', 'шагов'])}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {branchNodes.map(({ br, i, xb, done: bd }) => (
            <li
              key={br.id}
              className={`${styles.branch} ${bd ? styles.branchNodeDone : ''}`}
              style={{ left: `${xb}%`, top: i * ROW + MEDAL_Y - 22 }}
            >
              <button
                type="button"
                className={styles.nodeBtn}
                onClick={() => open(br)}
                aria-label={`Ответвление: ${br.title}${bd ? ', пройдено' : ', необязательно'}`}
              >
                <span className={styles.branchIcon}>
                  <Owl size="1.5rem" />
                </span>
                <span className={styles.branchLabel}>
                  <span className={styles.branchTitle}>{br.title}</span>
                  <span className={styles.labelMeta}>{bd ? 'пройдено' : 'по желанию'}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
