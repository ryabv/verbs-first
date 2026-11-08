import { useCallback, useRef, useState, type ReactNode } from 'react';
import type { Lesson, LessonStep, StepKind } from '@/entities/lesson';
import type { Verb } from '@/entities/verb';
import { useLessonProgress } from '@/features/lesson-progress';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { PrevNext } from '@/shared/ui/prev-next';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import { StepContent } from './StepContent';
import { KIND_LABELS, StepList } from './StepList';
import styles from './LessonPath.module.css';

/** Шаги, которые засчитываются только по выполнении (а не по кнопке «дальше»). */
const GOAL_KINDS: ReadonlySet<StepKind> = new Set(['drill', 'translate', 'dictation', 'oral']);

interface Props {
  lesson: Lesson;
  /** Последовательность шагов: lesson.steps или lesson.homework. */
  steps: LessonStep[];
  /** Ключ прогресса в хранилище (progressKey.lesson / progressKey.homework). */
  storageKey: string;
  /** Заголовок списка шагов в сайдбаре. */
  stepsTitle: string;
  /** Слот для просмотра таблиц глаголов (виджет verb-algorithm передаёт страница). */
  renderVerbs: (verbs: Verb[]) => ReactNode;
  /** Верх сайдбара: название урока, переключатель режимов. */
  sidebarHeader: ReactNode;
  crumbs: Crumb[];
  /** Экран после последнего шага. */
  finish: { title: string; text: ReactNode; actions: ReactNode };
}

/** Путь ученика: шаги в сайдбаре, текущий шаг — как статья учебника. */
export function LessonPath({ lesson, steps, storageKey, stepsTitle, renderVerbs, sidebarHeader, crumbs, finish }: Props) {
  const stepIds = steps.map((s) => s.id);
  const progress = useLessonProgress(storageKey, stepIds);
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
  const goNext = () => {
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
          <div className={styles.bar}>
            <div className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
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
        <div className={styles.kind}>{KIND_LABELS[step.kind]}</div>
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
        }}
      />
    </SidebarLayout>
  );
}
