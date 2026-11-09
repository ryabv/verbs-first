import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FORM_LABELS, TENSE_LABELS, type Verb } from '@/entities/verb';
import { Button } from '@/shared/ui/button';
import { GreekKeyboard, useGreekKeyboard } from '@/shared/ui/greek-keyboard';
import type { DrillCells } from '../model/task';
import { useDrill } from '../model/useDrill';
import styles from './ConjugationDrill.module.css';

const VERDICT_TEXT = {
  correct: 'Верно!',
  accent: 'Почти! Проверьте ударение',
  wrong: 'Пока нет — вернёмся к этому через пару заданий',
} as const;

interface Props extends DrillCells {
  verbs: readonly Verb[];
  /** Сколько верных ответов нужно, чтобы засчитать упражнение. Без goal — свободная тренировка. */
  goal?: number;
  onGoalReached?: () => void;
}

/** Тренажёр «таблицы умножения»: переводим фразу из случайной ячейки. */
export function ConjugationDrill({ verbs, tenses, forms, goal, onGoalReached }: Props) {
  const { task, answer, setAnswer, verdict, check, next, stats } = useDrill(verbs, { tenses, forms });
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboard = useGreekKeyboard();

  // Фокус в поле при открытии (на телефоне — только если ученик уже печатал, см. useGreekKeyboard).
  useEffect(() => {
    if (keyboard.autoFocus) inputRef.current?.focus();
  }, [keyboard.autoFocus]);
  // Подсказка (начальная форма глагола) — только по запросу, сама сбрасывается на новом задании.
  const [hintFor, setHintFor] = useState<string | null>(null);
  const hintShown = hintFor === task.key;

  // «Почти» (ошибка только в ударении) тоже засчитываем — свобода прежде правильности.
  const solved = stats.correct + stats.accent;
  const goalReached = goal !== undefined && solved >= goal;

  useEffect(() => {
    if (goalReached) onGoalReached?.();
  }, [goalReached, onGoalReached]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (verdict) next();
    else check();
    inputRef.current?.focus();
  };

  return (
    <div className={styles.drill}>
      {goal !== undefined ? (
        <div className={styles.goal}>
          <div className={styles.goalBar}>
            <div className={styles.goalFill} style={{ width: `${Math.min(solved / goal, 1) * 100}%` }} />
          </div>
          <span>
            {Math.min(solved, goal)} / {goal}
          </span>
        </div>
      ) : (
        <div className={styles.stats}>
          <span>✓ {stats.correct}</span>
          <span>≈ {stats.accent}</span>
          <span>✗ {stats.wrong}</span>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.metaRow}>
          <span className={styles.meta}>
            {TENSE_LABELS[task.cell.tense]} · {FORM_LABELS[task.cell.form]}
          </span>
          {hintShown || verdict ? (
            <span className={styles.lemma}>
              {task.verb.lemma} — {task.verb.translation}
            </span>
          ) : (
            <button type="button" className={styles.hintButton} onClick={() => setHintFor(task.key)}>
              Подсказка
            </button>
          )}
        </div>
        <div className={styles.prompt}>{task.prompt}</div>

        <form onSubmit={onSubmit} className={styles.form}>
          <input
            ref={inputRef}
            className={styles.input}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Напишите по-гречески…"
            lang="el"
            inputMode={keyboard.inputMode}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={verdict !== null}
          />
          <Button
          type="submit"
          variant={verdict ? 'secondary' : 'primary'}
          disabled={!verdict && !answer.trim()}
          // Фокус остаётся в поле: на телефоне клавиатура не прыгает вниз-вверх.
          onMouseDown={(e) => e.preventDefault()}
        >
            {verdict ? 'Ещё' : 'Проверить'}
          </Button>
        </form>

        {verdict && (
          <div className={`${styles.result} ${styles[verdict]}`}>
            <strong>{VERDICT_TEXT[verdict]}</strong>
            {verdict !== 'correct' && <div className={styles.expected}>{task.accepted[0]}</div>}
            {verdict === 'wrong' && task.cell.tense === 'past' && task.verb.pastHint && (
              <div className={styles.hint}>Подсказка: {task.verb.pastHint}</div>
            )}
          </div>
        )}

        {!verdict && (
          <GreekKeyboard
            open={keyboard.open}
            onToggle={keyboard.toggle}
            onKey={(ch) => setAnswer(answer + ch)}
            onBackspace={() => setAnswer(answer.slice(0, -1))}
          />
        )}
      </div>
    </div>
  );
}
