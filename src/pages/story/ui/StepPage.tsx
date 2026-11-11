import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { markStoryStep, STORY_END, useStoryDone, type StoryChapter, type StoryStep } from '@/entities/story';
import { analyzePhrase } from '@/features/card-add';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Arrow } from '@/shared/ui/ornament';
import { storyDeck } from '../lib/deck';
import { inFragment, tapCorrect, tokenId } from '../lib/task';
import { Rich } from './Rich';
import { StoryTask } from './StoryTask';
import { StoryText } from './StoryText';
import styles from './Story.module.css';

/** Шаг главы: слева объяснение и задача, справа текст. */
export function StepPage({ chapter, index }: { chapter: StoryChapter; index: number }) {
  const step = chapter.steps[index]!;
  // key — по шагу: при переходе состояние задачи начинается заново.
  return <Step key={step.id} chapter={chapter} step={step} index={index} />;
}

/** Слова текущего куска, которые надо нажать: id токенов. */
function tapTargets(chapter: StoryChapter, step: StoryStep): Map<string, string> {
  const out = new Map<string, string>();
  if (step.task?.kind !== 'tap') return out;
  const answer = new Set(step.task.answer);
  chapter.sentences.forEach((s, si) => {
    if (!inFragment(step, si + 1)) return;
    analyzePhrase(s.greek).forEach((t, ti) => t.isWord && answer.has(t.text) && out.set(tokenId(si + 1, ti), t.text));
  });
  return out;
}

function Step({ chapter, step, index }: { chapter: StoryChapter; step: StoryStep; index: number }) {
  const navigate = useNavigate();
  const done = useStoryDone(chapter.id);
  const wasDone = done.includes(step.id);
  const [solved, setSolved] = useState(wasDone || !step.task);
  const [picked, setPicked] = useState<Map<string, string>>(() => (wasDone ? tapTargets(chapter, step) : new Map()));
  const [tapVerdict, setTapVerdict] = useState<Map<string, boolean> | undefined>();
  const total = chapter.steps.length;
  const chipsRef = useRef<HTMLElement>(null);

  // На телефоне ряд шагов прокручивается вбок — показываем текущий по центру (без прокрутки страницы).
  useEffect(() => {
    const nav = chipsRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current]');
    if (nav && current) nav.scrollLeft = current.offsetLeft - nav.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, []);

  const solve = useCallback(() => {
    setSolved(true);
    markStoryStep(chapter.id, step.id);
  }, [chapter.id, step.id]);

  const targets = useMemo(() => tapTargets(chapter, step), [chapter, step]);
  const isTap = step.task?.kind === 'tap';

  const showAnswer = () => {
    if (isTap) setPicked(new Map(targets));
    setTapVerdict(undefined);
    solve();
  };

  const goNext = () => {
    if (!step.task) markStoryStep(chapter.id, step.id);
    navigate(index + 1 < total ? routes.storyStep(chapter.id, index + 2) : routes.storyStep(chapter.id, 'end'));
  };

  const tap = isTap
    ? {
        picked: new Set(picked.keys()),
        verdict: tapVerdict,
        toggle: (id: string, text: string) => {
          if (solved) return;
          setTapVerdict(undefined);
          setPicked((m) => {
            const next = new Map(m);
            if (next.has(id)) next.delete(id);
            else next.set(id, text);
            return next;
          });
        },
      }
    : undefined;

  const checkTap = () => {
    const answer = step.task?.kind === 'tap' ? step.task.answer : [];
    const ok = tapCorrect([...picked.values()], answer);
    setTapVerdict(new Map([...picked.keys()].map((id) => [id, targets.has(id)])));
    return ok;
  };

  return (
    <div className={styles.stepPage}>
      <div className={styles.split}>
        {/* Левая колонка закреплена целиком: крошки, шаги, объяснение, задача. Справа листается текст. */}
        <div className={styles.leftCol}>
          <div className={styles.stepHead}>
            <Breadcrumbs
              items={[
                { label: 'История', to: routes.story() },
                { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
                { label: step.title },
              ]}
            />
            <nav className={styles.chips} aria-label="Шаги главы" ref={chipsRef}>
              {chapter.steps.map((s, i) => {
                const cls = [styles.chip, done.includes(s.id) && styles.chipDone, i === index && styles.chipCurrent].filter(Boolean).join(' ');
                return (
                  <Link
                    key={s.id}
                    to={routes.storyStep(chapter.id, i + 1)}
                    className={cls}
                    title={`${i + 1}. ${s.title}${done.includes(s.id) ? ' — пройден' : ''}`}
                    aria-current={i === index ? 'step' : undefined}
                  >
                    {i + 1}
                  </Link>
                );
              })}
              <Link
                to={routes.storyStep(chapter.id, 'end')}
                className={done.includes(STORY_END) ? `${styles.chip} ${styles.chipDone}` : styles.chip}
                title="Вся глава и конспект"
              >
                ✦
              </Link>
            </nav>
          </div>
          <section className={styles.lessonPane}>
            <h1 className={styles.stepTitle}>{step.title}</h1>
            {step.body.map((p, i) => (
              <p key={i} className={styles.para}>
                <Rich text={p} wordDeck={storyDeck} />
              </p>
            ))}
            <StoryTask step={step} solved={solved} onSolved={solve} tap={isTap ? { count: picked.size, check: checkTap } : undefined} />

            <nav className={styles.stepNav}>
              {index > 0 ? (
                <Link to={routes.storyStep(chapter.id, index)} className={styles.prev}>
                  <Arrow direction="left" /> Назад
                </Link>
              ) : (
                <Link to={routes.storyChapter(chapter.id)} className={styles.prev}>
                  <Arrow direction="left" /> К главе
                </Link>
              )}
              {!solved && (
                <button type="button" className={styles.linkBtn} onClick={showAnswer}>
                  Показать ответ
                </button>
              )}
              <Button onClick={goNext} disabled={!solved}>
                {index + 1 < total ? 'Дальше' : 'Вся глава'} <Arrow />
              </Button>
            </nav>
          </section>
        </div>

        <aside className={styles.textPane} aria-label="Текст главы">
          <StoryText chapter={chapter} step={step} done={done} solved={solved} tap={tap} />
        </aside>
      </div>
    </div>
  );
}
