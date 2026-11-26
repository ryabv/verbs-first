import { Fragment, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import type { LessonStep } from '@/entities/lesson';
import { readExamResult } from '@/features/exam';
import { progressKey, useLessonProgress } from '@/features/lesson-progress';
import { routes } from '@/shared/config/routes';
import { useFocusMode } from '@/shared/lib/focus-mode';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button, buttonClassName } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { Arrow, Check } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { GOAL_KINDS, kindTag, notesAfter, PROLOGUE_NOTES, PROLOGUE_STAGES, PROLOGUE_STEPS, type PrologueNote } from '../lib/prologue';
import { NoteIcon } from './NoteIcon';
import { ReadingStep } from './ReadingStep';
import styles from './Prologue.module.css';

const IDS = [...PROLOGUE_STEPS.map((s) => s.id), ...PROLOGUE_NOTES.map((n) => n.step.id)];
const TOTAL = PROLOGUE_STEPS.length;
const HISTORY = { label: 'История', to: routes.story() };
const PROLOGUE = { label: 'Пролог', to: routes.alphabet() };
const READ_AFTER_MS = 10_000;

/** Прогресс пролога — та же запись, что у прежнего курса чтения (`reading`); экзамен засчитан, только когда сдан. */
function usePrologueProgress() {
  const progress = useLessonProgress(progressKey.reading, IDS);
  const { setDone } = progress;
  const examPassed = readExamResult('alphabet')?.passed ?? false;
  useEffect(() => {
    for (const s of PROLOGUE_STEPS) if (s.kind === 'exam') setDone(s.id, examPassed);
  }, [examPassed, setDone]);
  return progress;
}

/** /alphabet — оглавление пролога, как страница главы: шаги подряд, этапы — заголовки, заметки Анны — под своим шагом. */
export function PrologueOverview() {
  const { isDone } = usePrologueProgress();
  const doneCount = PROLOGUE_STEPS.filter((s) => isDone(s.id)).length;
  const firstUndone = PROLOGUE_STEPS.findIndex((s) => !isDone(s.id));
  const finished = firstUndone === -1;
  const here = <span className={styles.here}>Вы здесь</span>;
  const note = (n: PrologueNote) => (
    <li key={n.id} className={styles.noteRow}>
      <Link to={routes.alphabetNote(n.id)} className={styles.stepLink}>
        <span className={styles.stepNum}>
          <NoteIcon />
        </span>
        <span className={styles.stepName}>{n.title}</span>
        <span className={`${styles.stepKind} ${styles.noteKind}`}>заметка Анны</span>
        {isDone(n.step.id) && <Check className={styles.stepDone} />}
      </Link>
    </li>
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[HISTORY, { label: 'Пролог' }]} />
        <p className={styles.kicker}>Пролог · по желанию</p>
        <h1 className={styles.title}>Греческий алфавит</h1>
        <p className={styles.lead}>
          Пока самолёт летит на Кипр, Анна учится читать по-гречески. Буквы — по три-четыре за раз, сразу в слогах и
          словах, на слух и своими руками. Учить наизусть не нужно — алфавит запомнится сам. Уже читаете — начинайте сразу
          с главы 1.
        </p>
        <div className={styles.progress}>
          <ProgressBar value={doneCount / TOTAL} />
          <span>
            Пройдено: {doneCount}/{TOTAL}
          </span>
        </div>
        {finished && (
          <p className={styles.finished}>
            Вы читаете по-гречески: все буквы, сочетания и ударение позади, экзамен сдан <Check />
          </p>
        )}
        <div className={styles.actions}>
          {finished ? (
            <Link to={routes.storyChapter(1)} className={buttonClassName('primary')}>
              К главе 1 <Arrow />
            </Link>
          ) : (
            <Link to={routes.alphabetStep(firstUndone + 1)} className={buttonClassName('primary')}>
              {doneCount > 0 ? 'Продолжить' : 'Начать'} <Arrow />
            </Link>
          )}
          <Link to={routes.alphabetReference()} className={styles.refLink}>
            Справочник алфавита <Arrow />
          </Link>
        </div>
      </header>

      <ol className={styles.steps}>
        {PROLOGUE_STEPS.map((s, i) => {
          const stage = PROLOGUE_STAGES.find((st) => st.first === s.id);
          const current = i === firstUndone;
          return (
            <Fragment key={s.id}>
              {stage && (
                <li className={styles.stageRow} aria-hidden="true">
                  {stage.title}
                </li>
              )}
              {s.kind === 'exam' && (
                <li className={styles.stageRow} aria-hidden="true">
                  Итог
                </li>
              )}
              <li className={current ? styles.stepHere : undefined} aria-current={current ? 'step' : undefined}>
                <Link to={routes.alphabetStep(i + 1)} className={styles.stepLink}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <span className={styles.stepName}>
                    {s.title}
                    {current && here}
                  </span>
                  <span className={s.kind === 'exam' ? `${styles.stepKind} ${styles.examKind}` : styles.stepKind}>{kindTag(s)}</span>
                  {isDone(s.id) && <Check className={styles.stepDone} />}
                </Link>
              </li>
              {notesAfter(s.id).map(note)}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

/** /alphabet/:n — шаг пролога. Замков нет: «Дальше» доступно всегда; упражнение засчитывается, когда выполнено. */
export function PrologueStep({ index }: { index: number }) {
  const step = PROLOGUE_STEPS[index]!;
  return <Step key={step.id} step={step} index={index} />;
}

function Step({ step, index }: { step: LessonStep; index: number }) {
  const navigate = useNavigate();
  const { markDone } = usePrologueProgress();
  // Чтение засчитывается, когда открыто (как шаг главы); задание — по выполнении.
  useEffect(() => {
    if (!GOAL_KINDS.has(step.kind)) markDone(step.id);
  }, [markDone, step]);
  useFocusMode();

  const stage = step.stage ? PROLOGUE_STAGES[step.stage - 1]?.title : 'Итог';
  const last = index + 1 >= TOTAL;
  const goNext = () => {
    // replace: шаги пролога — одна запись истории, «назад» ведёт туда, откуда в него пришли.
    navigate(last ? routes.alphabet() : routes.alphabetStep(index + 2), { replace: true });
    window.scrollTo({ top: 0 });
  };
  const notes = notesAfter(step.id);

  return (
    <div className={styles.stepPage}>
      <header className={styles.stepHead}>
        <Breadcrumbs items={[HISTORY, PROLOGUE, { label: step.title }]} />
        <p className={styles.kicker}>
          Шаг {index + 1} из {TOTAL} · {stage}
        </p>
        <h1 className={styles.stepTitle}>{step.title}</h1>
      </header>

      {step.intro && <Callout>{step.intro}</Callout>}
      <div className={styles.body}>
        <ReadingStep step={step} onGoal={() => markDone(step.id)} />
      </div>

      {notes.length > 0 && (
        <aside className={styles.notes} aria-label="Заметки Анны">
          <span className={styles.noteBadgeSmall}>
            <NoteIcon size="1.2rem" />
          </span>
          <div>
            <p className={styles.notesLead}>В блокноте Анны есть заметка об этом — по желанию:</p>
            <ul className={styles.notesList}>
              {notes.map((n) => (
                <li key={n.id}>
                  <Link to={routes.alphabetNote(n.id)}>{n.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      <nav className={styles.stepNav}>
        {index > 0 ? (
          <Link to={routes.alphabetStep(index)} replace className={styles.prev}>
            <Arrow direction="left" /> Назад
          </Link>
        ) : (
          <Link to={routes.alphabet()} className={styles.prev}>
            <Arrow direction="left" /> К прологу
          </Link>
        )}
        <Button onClick={goNext}>
          {last ? 'Конец пролога' : 'Дальше'} <Arrow />
        </Button>
      </nav>
    </div>
  );
}

/** /alphabet/note/:id — заметка Анны. Необязательна: на прогресс пролога не влияет. */
export function PrologueNotePage({ note }: { note: PrologueNote }) {
  const { markDone } = usePrologueProgress();
  // Прочитана — если провели на странице 10 секунд: случайный заход не считается.
  useEffect(() => {
    const timer = window.setTimeout(() => markDone(note.step.id), READ_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [markDone, note]);
  const others = PROLOGUE_NOTES.filter((n) => n.id !== note.id);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[HISTORY, PROLOGUE, { label: 'Заметка Анны' }]} />
        <div className={styles.noteHead}>
          <span className={styles.noteBadge}>
            <NoteIcon size="1.8rem" />
          </span>
          <div>
            <p className={styles.kicker}>Заметка Анны · по желанию</p>
            <h1 className={styles.noteTitle}>{note.title}</h1>
          </div>
        </div>
      </header>

      <div className={styles.note}>
        <ReadingStep step={note.step} onGoal={() => undefined} />
      </div>

      <div className={styles.actions}>
        <Link to={routes.alphabet()} className={buttonClassName('primary')}>
          <Arrow direction="left" /> К прологу
        </Link>
        {others.map((n) => (
          <Link key={n.id} to={routes.alphabetNote(n.id)} className={styles.otherNote}>
            <NoteIcon /> {n.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
