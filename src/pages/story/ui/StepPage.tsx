import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  chapterRank,
  doneAt,
  levelRank,
  markStoryStep,
  useStoryLevel,
  useStoryLevels,
  type StoryChapter,
  type StoryStep,
} from '@/entities/story';
import { analyzePhrase } from '@/features/card-add';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Arrow } from '@/shared/ui/ornament';
import { storyDeck } from '../lib/deck';
import { inFragment, tapCorrect, tokenId } from '../lib/task';
import { LevelSwitch } from './LevelSwitch';
import { Manuscript } from './Manuscript';
import { Rich } from './Rich';
import { StoryTask } from './StoryTask';
import { StoryText } from './StoryText';
import styles from './Story.module.css';

/** Шаг главы: слева объяснение и задача, справа текст. */
export function StepPage({ chapter, index }: { chapter: StoryChapter; index: number }) {
  const step = chapter.steps[index]!;
  const level = useStoryLevel();
  // key — по шагу и уровню: при переходе или смене уровня задача начинается заново.
  return <Step key={`${step.id}-${level}`} chapter={chapter} step={step} index={index} />;
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
  const level = useStoryLevel();
  const levels = useStoryLevels(chapter.id);
  // Пройдено на этом уровне или сложнее — засчитано.
  const done = doneAt(levels, level);
  const wasDone = (levels[step.id] ?? 0) >= levelRank(level);
  const [solved, setSolved] = useState(wasDone || !step.task);
  const [picked, setPicked] = useState<Map<string, string>>(() => (wasDone ? tapTargets(chapter, step) : new Map()));
  const [tapVerdict, setTapVerdict] = useState<Map<string, boolean> | undefined>();
  const total = chapter.steps.length;
  const solve = useCallback(() => {
    setSolved(true);
    markStoryStep(chapter.id, step.id, level);
  }, [chapter.id, step.id, level]);

  const targets = useMemo(() => tapTargets(chapter, step), [chapter, step]);
  const isTap = step.task?.kind === 'tap';

  const showAnswer = () => {
    if (isTap) setPicked(new Map(targets));
    setTapVerdict(undefined);
    solve();
  };

  const goNext = () => {
    if (!step.task) markStoryStep(chapter.id, step.id);
    // Следующий шаг — без прокрутки наверх: кусок рядом, текст сам подвинется, если его не видно.
    if (index + 1 < total) navigate(routes.storyStep(chapter.id, index + 2), { preventScrollReset: true });
    else navigate(routes.storyStep(chapter.id, 'end'));
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
        {/* Левая колонка закреплена целиком: крошки, объяснение, задача. Справа листается текст; шаги — куски текста. */}
        <div className={styles.leftCol}>
          <div className={styles.stepHead}>
            <Breadcrumbs
              items={[
                { label: 'История', to: routes.story() },
                { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
                { label: step.title },
              ]}
            />
            <LevelSwitch passed={chapterRank(chapter, levels)} />
          </div>
          <section className={styles.lessonPane}>
            <h1 className={styles.stepTitle}>{step.title}</h1>
            {step.body.map((p, i) => (
              <p key={i} className={styles.para}>
                <Rich text={p} wordDeck={storyDeck} />
              </p>
            ))}
            <StoryTask step={step} level={level} solved={solved} onSolved={solve} tap={isTap ? { count: picked.size, check: checkTap } : undefined} />

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

        <Manuscript chapter={chapter} className={styles.textPane} label="Текст главы">
          <StoryText chapter={chapter} step={step} done={done} solved={solved} tap={tap} />
        </Manuscript>
      </div>
    </div>
  );
}
