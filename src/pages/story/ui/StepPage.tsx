import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { doneAt, markStoryStep, useStoryLevels, type StoryChapter, type StoryCheck, type StoryStep } from '@/entities/story';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Arrow, Check } from '@/shared/ui/ornament';
import { storyDeck } from '../lib/deck';
import { shuffle } from '../lib/task';
import { CatIcon } from './CatIcon';
import { Manuscript } from './Manuscript';
import { Rich } from './Rich';
import { StoryText } from './StoryText';
import { useFocusMode } from '@/shared/lib/focus-mode';
import styles from './Story.module.css';

/** Шаг главы: слева объяснение и вопрос на понимание, справа текст. Замков нет: «Дальше» доступно всегда. */
export function StepPage({ chapter, index }: { chapter: StoryChapter; index: number }) {
  const step = chapter.steps[index]!;
  // key — по шагу: при переходе вопрос начинается заново.
  return <Step key={step.id} chapter={chapter} step={step} index={index} />;
}

function Step({ chapter, step, index }: { chapter: StoryChapter; step: StoryStep; index: number }) {
  const navigate = useNavigate();
  const levels = useStoryLevels(chapter.id);
  const done = doneAt(levels, 'light');
  const wasRead = done.includes(step.id);
  const [answered, setAnswered] = useState(wasRead || !step.check);
  const total = chapter.steps.length;

  // Шаг открыт — значит, прочитан: глава не держит ученика на вопросе.
  useEffect(() => markStoryStep(chapter.id, step.id), [chapter.id, step.id]);

  const goNext = () => {
    // Следующий шаг — без прокрутки наверх: кусок рядом, текст сам подвинется, если его не видно.
    if (index + 1 < total) navigate(routes.storyStep(chapter.id, index + 2), { preventScrollReset: true });
    else navigate(routes.storyStep(chapter.id, 'end'));
  };

  useFocusMode();
  return (
    <div className={styles.stepPage}>
      <div className={styles.split}>
        {/* Левая колонка закреплена целиком: крошки, объяснение, вопрос. Справа листается текст; шаги — куски текста. */}
        <div className={styles.leftCol}>
          <div className={styles.stepHead}>
            <Breadcrumbs
              items={[
                { label: 'История', to: routes.story() },
                { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
                { label: step.title },
              ]}
            />
          </div>
          <section className={styles.lessonPane}>
            <h1 className={styles.stepTitle}>{step.title}</h1>
            {step.body.map((p, i) => (
              <p key={i} className={styles.para}>
                <Rich text={p} wordDeck={storyDeck} />
              </p>
            ))}
            {step.check && <CheckCard check={step.check} answered={answered} onAnswer={() => setAnswered(true)} />}

            <CatTales chapter={chapter} step={step} />

            <nav className={styles.stepNav}>
              {index > 0 ? (
                <Link to={routes.storyStep(chapter.id, index)} className={styles.prev} preventScrollReset>
                  <Arrow direction="left" /> Назад
                </Link>
              ) : (
                <Link to={routes.storyChapter(chapter.id)} className={styles.prev}>
                  <Arrow direction="left" /> К главе
                </Link>
              )}
              <Button onClick={goNext}>
                {index + 1 < total ? 'Дальше' : 'Конец главы'} <Arrow />
              </Button>
            </nav>
          </section>
        </div>

        <Manuscript chapter={chapter} className={styles.textPane} label="Текст главы">
          <StoryText chapter={chapter} step={step} done={done} answered={answered} />
        </Manuscript>
      </div>
    </div>
  );
}

/**
 * Вопрос на понимание: одно нажатие, провалить нельзя. Неверный вариант — подсказка «посмотрите в текст»
 * и сразу виден верный; продолжить можно и без ответа.
 */
function CheckCard({ check, answered, onAnswer }: { check: StoryCheck; answered: boolean; onAnswer: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [order] = useState(() => shuffle(check.options.map((_, i) => i), check.prompt));
  const right = picked === check.answer;
  const shown = answered || picked !== null;
  const pick = (i: number) => {
    setPicked(i);
    onAnswer();
  };
  return (
    <section className={styles.check} aria-label="Вопрос на понимание">
      <p className={styles.taskPrompt}>
        {check.prompt}
        {check.audio && <SpeakButton text={check.audio} />}
      </p>
      <div className={styles.options}>
        {order.map((i) => {
          const cls = [
            styles.option,
            shown && i === check.answer && styles.optionRight,
            picked === i && !right && styles.optionWrong,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={i} type="button" className={cls} disabled={shown} onClick={() => pick(i)}>
              {check.options[i]}
            </button>
          );
        })}
      </div>
      {picked !== null &&
        (right ? (
          <p className={styles.solved}>
            <Check /> Верно.
          </p>
        ) : (
          <p className={styles.hintWrong}>Не совсем — верный ответ отмечен. Загляните в текст справа.</p>
        ))}
    </section>
  );
}

/** Рассказы кота к этому шагу — отдельной плашкой под заданием, не в тексте главы. */
function CatTales({ chapter, step }: { chapter: StoryChapter; step: StoryStep }) {
  const tales = (chapter.branches ?? []).filter((b) => b.after === step.id);
  if (tales.length === 0) return null;
  return (
    <aside className={styles.catTales} aria-label="Рассказы кота">
      <span className={styles.catBadgeSmall}>
        <CatIcon size="1.3rem" />
      </span>
      <div>
        <p className={styles.catTalesLead}>
          <span lang="el">Ερμής</span> хочет кое-что рассказать — по желанию:
        </p>
        <ul className={styles.catTalesList}>
          {tales.map((b) => (
            <li key={b.id}>
              <Link to={routes.storyBranch(chapter.id, b.id)}>{b.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
