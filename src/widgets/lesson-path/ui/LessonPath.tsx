import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Lesson, LessonStep, StepKind } from '@/entities/lesson';
import type { Verb } from '@/entities/verb';
import { readExamResult } from '@/features/exam';
import { useLessonProgress } from '@/features/lesson-progress';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { Laurel } from '@/shared/ui/ornament';
import { PrevNext } from '@/shared/ui/prev-next';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import { StepContent } from './StepContent';
import { KIND_LABELS, StepList } from './StepList';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './LessonPath.module.css';

/** Шаги, которые засчитываются только по выполнении (а не по кнопке «дальше»). */
const GOAL_KINDS: ReadonlySet<StepKind> = new Set(['drill', 'translate', 'dictation', 'oral', 'exam']);

interface Props {
  /** Шаг из адреса (?step=…). */
  openStepId?: string;
  /** Текущий шаг сменился — записать в адрес. initial: первая запись (заменить, а не добавить в историю). */
  onStepChange?: (id: string, initial: boolean) => void;
  lesson: Lesson;
  /** Весь путь: урок → домашнее задание → экзамен (lessonPath). */
  steps: LessonStep[];
  /** Ключ прогресса в хранилище (progressKey.lesson). */
  storageKey: string;
  /** Заголовок списка шагов в сайдбаре. */
  stepsTitle: string;
  /** Слот для просмотра таблиц глаголов (виджет verb-algorithm передаёт страница). */
  renderVerbs: (verbs: Verb[]) => ReactNode;
  /** Верх сайдбара: название урока, ссылка на справочник. */
  sidebarHeader: ReactNode;
  crumbs: Crumb[];
  /** Экран после последнего шага. */
  finish: { title: string; text: ReactNode; actions: ReactNode };
}

/** Путь ученика: шаги в сайдбаре, текущий шаг — как статья учебника. */
export function LessonPath({ openStepId, onStepChange, lesson, steps, storageKey, stepsTitle, renderVerbs, sidebarHeader, crumbs, finish }: Props) {
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const progress = useLessonProgress(storageKey, stepIds);
  const { goTo, currentId, setDone } = progress;

  // Адрес ↔ текущий шаг. synced — последний шаг, о котором договорились адрес и состояние:
  // изменился адрес (ссылка, «назад») — идём на шаг; изменился шаг — пишем в адрес.
  const synced = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (openStepId && openStepId !== synced.current && stepIds.includes(openStepId)) {
      synced.current = openStepId;
      goTo(openStepId);
      return;
    }
    if (currentId && currentId !== synced.current) {
      const initial = synced.current === undefined;
      synced.current = currentId;
      onStepChange?.(currentId, initial);
    }
  }, [openStepId, currentId, stepIds, goTo, onStepChange]);

  // Экзамен отмечен пройденным тогда и только тогда, когда он сдан.
  const examPassed = readExamResult(lesson.id)?.passed ?? false;
  useEffect(() => {
    for (const s of steps) if (s.kind === 'exam') setDone(s.id, examPassed);
  }, [steps, examPassed, setDone]);
  const [celebrate, setCelebrate] = useState(false);
  // На телефоне список шагов свёрнут, чтобы задание было на первом экране.
  const [stepsOpen, setStepsOpen] = useState(false);
  const headRef = useRef<HTMLElement>(null);

  const step = steps[progress.currentIndex];
  const { markDone } = progress;
  const onGoal = useCallback(() => step && markDone(step.id), [markDone, step]);

  if (!step) return null;

  const isLast = progress.currentIndex === steps.length - 1;
  const prevStep = steps[progress.currentIndex - 1];
  const nextStep = steps[progress.currentIndex + 1];
  const percent = Math.round((progress.completedCount / steps.length) * 100);

  // На компьютере — в начало страницы; на телефоне сайдбар стоит над шагом, поэтому к заголовку шага.
  const scrollTop = () => {
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    const top = narrow && headRef.current ? headRef.current.getBoundingClientRect().top + window.scrollY - 8 : 0;
    window.scrollTo({ top, behavior: 'smooth' });
  };
  // Последний шаг-задание (экзамен) не завершить, пока оно не выполнено.
  const finishLocked = isLast && GOAL_KINDS.has(step.kind) && !progress.isDone(step.id);
  const goNext = () => {
    if (finishLocked) return;
    // Упражнение засчитывается только по выполнении; пропуск — просто переход дальше.
    if (GOAL_KINDS.has(step.kind) && !progress.isDone(step.id) && nextStep) progress.goTo(nextStep.id);
    else progress.completeAndNext();
    if (isLast) setCelebrate(true);
    scrollTop();
  };

  const sidebar = (
    <>
      {sidebarHeader}
      <SidebarSection title={stepsTitle}>
        <div className={styles.overall}>
          <ProgressBar value={percent / 100} thin />
          <span>{percent}%</span>
        </div>
        <button
          type="button"
          className={styles.stepsToggle}
          onClick={() => setStepsOpen((v) => !v)}
          aria-expanded={stepsOpen}
        >
          <span>
            Шаг {progress.currentIndex + 1} из {steps.length}: {step.title}
          </span>
          <span className={styles.chevron}>{stepsOpen ? '▴' : '▾'}</span>
        </button>
        <div className={stepsOpen ? styles.stepsWrapOpen : styles.stepsWrap}>
          <StepList
            steps={steps}
            partTitles={lesson.homeworkParts}
            statusOf={progress.statusOf}
            onSelect={(id) => {
              setCelebrate(false);
              setStepsOpen(false);
              progress.goTo(id);
              scrollTop();
            }}
          />
        </div>
      </SidebarSection>
    </>
  );

  if (celebrate) {
    return (
      <SidebarLayout sidebar={sidebar}>
        <header className={styles.head}>
          <Breadcrumbs items={[...crumbs, { label: 'Итог' }]} />
          <Laurel className={styles.finishLaurel} size="4.5rem" />
          <h1 className={styles.title}>{finish.title}</h1>
        </header>
        <Callout kind="ok" title="Что дальше">
          {finish.text}
        </Callout>
        <div className={styles.finishActions}>
          {finish.actions}
          <Button
            variant="ghost"
            onClick={() => {
              progress.reset();
              setCelebrate(false);
            }}
          >
            Пройти заново
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout sidebar={sidebar}>
      <header className={styles.head} ref={headRef}>
        <Breadcrumbs items={[...crumbs, { label: `Шаг ${progress.currentIndex + 1} из ${steps.length}` }]} />
        <div className={step.kind === 'exam' ? `${styles.kind} ${styles.kindExam}` : styles.kind}>{KIND_LABELS[step.kind]}</div>
        <h1 className={styles.title}>{step.title}</h1>
      </header>

      {step.intro && <Callout>{step.intro}</Callout>}

      <div className={styles.body}>
        <StepContent key={step.id} lesson={lesson} step={step} onGoal={onGoal} renderVerbs={renderVerbs} />
      </div>

      <PrevNext
        prev={
          prevStep && {
            label: 'Предыдущий шаг',
            title: prevStep.title,
            onClick: () => {
              progress.goTo(prevStep.id);
              scrollTop();
            },
          }
        }
        next={{
          label: isLast ? 'Последний шаг' : 'Следующий шаг',
          title: isLast ? 'Завершить' : (nextStep?.title ?? ''),
          onClick: goNext,
          disabled: finishLocked,
          hint: step.kind === 'exam' ? 'Сначала сдайте экзамен' : 'Сначала выполните задание',
        }}
      />
    </SidebarLayout>
  );
}
