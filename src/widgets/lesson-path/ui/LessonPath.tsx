import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { stageOfStep, type LessonStage, type LessonStep, type StepKind } from '@/entities/lesson';
import { readExamResult } from '@/features/exam';
import { isStageDone, stageEntryStep, useLessonProgress } from '@/features/lesson-progress';
import { Arrow } from '@/shared/ui/ornament';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { PrevNext } from '@/shared/ui/prev-next';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import { KIND_LABELS, StepList } from './StepList';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './LessonPath.module.css';

/** Шаги, которые засчитываются только по выполнении (а не по кнопке «дальше»). */
const GOAL_KINDS: ReadonlySet<StepKind> = new Set(['drill', 'translate', 'dictation', 'oral', 'exam', 'choice', 'build', 'order']);

interface Props {
  /** Шаг из адреса (?step=…). */
  openStepId?: string;
  /** Текущий шаг сменился — записать в адрес. initial: первая запись (заменить, а не добавить в историю). */
  onStepChange?: (id: string, initial: boolean) => void;
  /** id экзамена курса (номер урока или 'alphabet'): шаг экзамена засчитан, только если он сдан. */
  examId: number | string;
  /** Весь путь по этапам: урок → домашнее задание → экзамен (lessonStages). */
  stages: LessonStage[];
  /** Необязательные ответвления от этапов (lessonBranches). */
  branches: LessonStage[];
  /** Ключ прогресса в хранилище (progressKey.lesson). */
  storageKey: string;
  /** Содержимое шага: урок рисует StepContent, курс чтения — свои упражнения. onGoal — задание выполнено. */
  renderStep: (step: LessonStep, onGoal: () => void) => ReactNode;
  /** Верх сайдбара: название урока, ссылка на справочник. */
  sidebarHeader: ReactNode;
  /** Крошки до карты урока включительно. */
  crumbs: Crumb[];
  /** Вернуться на карту урока (в конце этапа — там ждёт медальон). */
  onOpenMap: () => void;
}

/** Путь ученика внутри этапа: шаги этапа в сайдбаре, текущий шаг — как статья учебника. */
export function LessonPath({ openStepId, onStepChange, examId, stages, branches, storageKey, renderStep, sidebarHeader, crumbs, onOpenMap }: Props) {
  // Шаги ответвлений — после основного пути: так «дальше» внутри ответвления не уводит в основной путь.
  const all = useMemo(() => [...stages, ...branches], [stages, branches]);
  const steps = useMemo(() => all.flatMap((st) => st.steps), [all]);
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const progress = useLessonProgress(storageKey, stepIds);
  const { goTo, currentId, setDone } = progress;

  // Адрес ↔ текущий шаг. synced — последний шаг, о котором договорились адрес и состояние:
  // изменился адрес (ссылка, «назад») — идём на шаг; изменился шаг — пишем в адрес.
  // pending — шаг из адреса, на который ещё не перешли: пока переход не применился, адрес не трогаем
  // (иначе повторный запуск эффекта успеет записать в адрес старый шаг).
  const synced = useRef<string | undefined>(undefined);
  const pending = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (openStepId && openStepId !== synced.current && stepIds.includes(openStepId)) {
      synced.current = openStepId;
      pending.current = openStepId;
      goTo(openStepId);
      return;
    }
    if (pending.current) {
      if (currentId !== pending.current) return;
      pending.current = undefined;
    }
    if (currentId && currentId !== synced.current) {
      const initial = synced.current === undefined;
      synced.current = currentId;
      onStepChange?.(currentId, initial);
    }
  }, [openStepId, currentId, stepIds, goTo, onStepChange]);

  // Экзамен отмечен пройденным тогда и только тогда, когда он сдан.
  const examPassed = readExamResult(examId)?.passed ?? false;
  useEffect(() => {
    for (const s of steps) if (s.kind === 'exam') setDone(s.id, examPassed);
  }, [steps, examPassed, setDone]);
  // На телефоне список шагов свёрнут, чтобы задание было на первом экране.
  const [stepsOpen, setStepsOpen] = useState(false);
  const headRef = useRef<HTMLElement>(null);

  const step = steps[progress.currentIndex];
  const { markDone } = progress;
  const onGoal = useCallback(() => step && markDone(step.id), [markDone, step]);

  const stage = step && stageOfStep(all, step.id);
  const isBranch = stage?.section === 'branch';
  const parent = isBranch ? stages.find((st) => st.id === stage.parent) : undefined;
  if (!step || !stage) return null;

  const indexInStage = stage.steps.indexOf(step);
  const prevStep = stage.steps[indexInStage - 1];
  const nextStep = stage.steps[indexInStage + 1];
  const isStageEnd = !nextStep;
  const doneInStage = stage.steps.filter((s) => progress.isDone(s.id)).length;
  // Мягкий порядок: этап открыт, но если раньше есть непройденный — подскажем начать с него.
  const missed = isBranch ? undefined : stages.slice(0, stage.n - 1).find((st) => !isStageDone(st, progress.isDone));

  // На компьютере — в начало страницы; на телефоне сайдбар стоит над шагом, поэтому к заголовку шага.
  const scrollTop = () => {
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    const top = narrow && headRef.current ? headRef.current.getBoundingClientRect().top + window.scrollY - 8 : 0;
    window.scrollTo({ top, behavior: 'smooth' });
  };
  // Экзамен не завершить, пока он не сдан.
  const finishLocked = step.kind === 'exam' && !progress.isDone(step.id);
  const goNext = () => {
    if (finishLocked) return;
    // Упражнение засчитывается только по выполнении; пропуск — просто переход дальше.
    const skip = GOAL_KINDS.has(step.kind) && !progress.isDone(step.id);
    // Конец этапа — на карту (там медальон). Текущий шаг не двигаем: иначе он успеет записаться в адрес
    // поверх перехода на карту; карта сама ведёт к первому непройденному этапу.
    if (isStageEnd) {
      if (!skip) progress.markDone(step.id);
      onOpenMap();
      return;
    }
    if (skip) progress.goTo(nextStep.id);
    else progress.completeAndNext();
    scrollTop();
  };

  const sidebar = (
    <>
      {/* Назад на карту — первым, как привычная кнопка «назад»: не искать под списком шагов. */}
      <button type="button" className={styles.mapLink} onClick={onOpenMap}>
        <Arrow direction="left" /> К карте урока
      </button>
      {sidebarHeader}
      <SidebarSection title={isBranch ? `Ответвление · ${parent?.title ?? ''}` : `Этап ${stage.n} из ${stages.length}`}>
        <div className={styles.stageTitle}>
          {stage.kicker && !isBranch && <div className={styles.stageKicker}>{stage.kicker}</div>}
          {stage.title}
        </div>
        <div className={styles.overall}>
          <ProgressBar value={doneInStage / stage.steps.length} thin />
          <span>
            {doneInStage}/{stage.steps.length}
          </span>
        </div>
        <button
          type="button"
          className={styles.stepsToggle}
          onClick={() => setStepsOpen((v) => !v)}
          aria-expanded={stepsOpen}
        >
          <span>
            Шаг {indexInStage + 1} из {stage.steps.length}: {step.title}
          </span>
          <span className={styles.chevron}>{stepsOpen ? '▴' : '▾'}</span>
        </button>
        <div className={stepsOpen ? styles.stepsWrapOpen : styles.stepsWrap}>
          <StepList
            steps={stage.steps}
            statusOf={progress.statusOf}
            onSelect={(id) => {
              setStepsOpen(false);
              progress.goTo(id);
              scrollTop();
            }}
          />
        </div>
      </SidebarSection>
    </>
  );

  return (
    <SidebarLayout sidebar={sidebar}>
      <header className={styles.head} ref={headRef}>
        <Breadcrumbs items={[...crumbs, ...(parent ? [{ label: parent.title }] : []), { label: stage.title }]} />
        <div className={step.kind === 'exam' ? `${styles.kind} ${styles.kindExam}` : styles.kind}>{KIND_LABELS[step.kind]}</div>
        <h1 className={styles.title}>{step.title}</h1>
      </header>

      {missed && (
        <Callout kind="warn" title="Лучше по порядку">
          <p>
            Этот этап опирается на предыдущие, а этап «{missed.title}» ещё не пройден.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              progress.goTo(stageEntryStep(missed, progress.isDone));
              scrollTop();
            }}
          >
            Перейти к этапу «{missed.title}»
          </Button>
        </Callout>
      )}

      {isBranch && indexInStage === 0 && (
        <Callout kind="ok" title="Необязательное ответвление">
          Для тех, кто хочет задержаться на теме. На прогресс урока не влияет — можно вернуться сюда позже.
        </Callout>
      )}

      {step.intro && <Callout>{step.intro}</Callout>}

      <div className={styles.body}>
        <div key={step.id}>{renderStep(step, onGoal)}</div>
      </div>

      <PrevNext
        prev={
          prevStep
            ? {
                label: 'Предыдущий шаг',
                title: prevStep.title,
                onClick: () => {
                  progress.goTo(prevStep.id);
                  scrollTop();
                },
              }
            : { label: 'Назад', title: 'Карта урока', onClick: onOpenMap }
        }
        next={{
          label: isStageEnd ? (isBranch ? 'Конец ответвления' : 'Конец этапа') : 'Следующий шаг',
          title: isStageEnd ? (step.kind === 'exam' ? 'Завершить урок' : 'К карте урока') : nextStep.title,
          onClick: goNext,
          disabled: finishLocked,
          hint: 'Сначала сдайте экзамен',
        }}
      />
    </SidebarLayout>
  );
}
