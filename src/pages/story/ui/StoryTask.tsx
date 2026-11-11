import { useState, type FormEvent } from 'react';
import type { StoryStep } from '@/entities/story';
import { SpeakButton } from '@/features/pronounce';
import { compareAnswer, type AnswerVerdict } from '@/shared/lib/greek';
import { Button } from '@/shared/ui/button';
import { Check } from '@/shared/ui/ornament';
import { Rich } from './Rich';
import { storyDeck } from '../lib/deck';
import styles from './Story.module.css';

interface Props {
  step: StoryStep;
  solved: boolean;
  onSolved: () => void;
  /** Для «нажмите слова»: проверка выбранного (состояние выбора — у страницы, слова — в тексте). */
  tap?: { count: number; check: () => boolean };
}

/** Задача шага: пропуски, выбор слов в тексте, выбор варианта. */
export function StoryTask({ step, solved, onSolved, tap }: Props) {
  const task = step.task;
  if (!task) return null;

  return (
    <section className={styles.task}>
      <h3 className={styles.taskTitle}>Задание</h3>
      {task.kind === 'gap' && <GapTask key={step.id} gaps={task.gaps} options={task.options} solved={solved} onSolved={onSolved} />}
      {task.kind === 'tap' && tap && <TapTask key={step.id} prompt={task.prompt} answer={task.answer} solved={solved} onSolved={onSolved} {...tap} />}
      {task.kind === 'choose' && (
        <ChooseTask key={step.id} prompt={task.prompt} options={task.options} answer={task.answer} audio={task.audio} solved={solved} onSolved={onSolved} />
      )}
    </section>
  );
}

function Solved() {
  return (
    <p className={styles.solved}>
      <Check /> Верно — история продолжается.
    </p>
  );
}

function GapTask({
  gaps,
  options,
  solved,
  onSolved,
}: {
  gaps: { word: string; hint: string }[];
  options?: string[];
  solved: boolean;
  onSolved: () => void;
}) {
  const [values, setValues] = useState(() => gaps.map(() => ''));
  const [verdicts, setVerdicts] = useState<(AnswerVerdict | null)[]>(() => gaps.map(() => null));
  const [wrongOption, setWrongOption] = useState<string | null>(null);

  if (options && gaps.length === 1) {
    const [gap] = gaps;
    return (
      <>
        <p className={styles.taskPrompt}>
          Выберите слово для пропуска (<Rich text={gap!.hint} wordDeck={storyDeck} />):
        </p>
        <div className={styles.options} lang="el">
          {options.map((o) => {
            const right = solved && o === gap!.word;
            const cls = [styles.option, right && styles.optionRight, o === wrongOption && !solved && styles.optionWrong].filter(Boolean).join(' ');
            return (
              <button
                key={o}
                type="button"
                className={cls}
                disabled={solved}
                onClick={() => {
                  if (o === gap!.word) onSolved();
                  else setWrongOption(o);
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
        {solved ? <Solved /> : wrongOption && <p className={styles.hintWrong}>Не то — посмотрите на объяснение выше.</p>}
      </>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = gaps.map((g, i) => compareAnswer(values[i] ?? '', [g.word]));
    setVerdicts(next);
    if (next.every((v) => v !== 'wrong')) onSolved();
  };

  return (
    <form onSubmit={submit}>
      <p className={styles.taskPrompt}>{gaps.length > 1 ? 'Впишите формы в пропуски:' : 'Впишите форму в пропуск:'}</p>
      <div className={styles.gaps}>
        {gaps.map((g, i) => (
          <label key={i} className={styles.gapField}>
            <span className={styles.gapHint}>
              {gaps.length > 1 && <b>{i + 1}. </b>}
              <Rich text={g.hint} wordDeck={storyDeck} />
            </span>
            <input
              className={[styles.input, verdicts[i] === 'wrong' && styles.inputWrong].filter(Boolean).join(' ')}
              value={solved ? g.word : (values[i] ?? '')}
              readOnly={solved}
              onChange={(e) => setValues((vs) => vs.map((v, j) => (j === i ? e.target.value : v)))}
              lang="el"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`Пропуск ${i + 1}: ${g.hint}`}
            />
          </label>
        ))}
      </div>
      {solved ? (
        <>
          <Solved />
          {verdicts.some((v) => v === 'accent') && <p className={styles.hintWrong}>Проверьте ударение: правильно — {gaps.map((g) => g.word).join(', ')}.</p>}
        </>
      ) : (
        <div className={styles.taskActions}>
          <Button type="submit">Проверить</Button>
          {verdicts.some((v) => v === 'wrong') && <span className={styles.hintWrong}>Не совсем — попробуйте ещё раз.</span>}
        </div>
      )}
    </form>
  );
}

function TapTask({
  prompt,
  solved,
  onSolved,
  count,
  check,
}: {
  prompt: string;
  answer: string[];
  solved: boolean;
  onSolved: () => void;
  count: number;
  check: () => boolean;
}) {
  const [wrong, setWrong] = useState(false);
  return (
    <>
      <p className={styles.taskPrompt}>
        <Rich text={prompt} wordDeck={storyDeck} /> Слова нажимаются прямо в тексте.
      </p>
      {solved ? (
        <Solved />
      ) : (
        <div className={styles.taskActions}>
          <Button
            disabled={count === 0}
            onClick={() => {
              if (check()) onSolved();
              else setWrong(true);
            }}
          >
            Проверить
          </Button>
          {wrong && <span className={styles.hintWrong}>Не совсем: лишнее отмечено красным — или найдено не всё.</span>}
        </div>
      )}
    </>
  );
}

function ChooseTask({
  prompt,
  options,
  answer,
  audio,
  solved,
  onSolved,
}: {
  prompt: string;
  options: string[];
  answer: number;
  audio?: string;
  solved: boolean;
  onSolved: () => void;
}) {
  const [wrong, setWrong] = useState<number | null>(null);
  return (
    <>
      {/* Упражнение: слова в вопросе без перевода — не подсказываем ответ. */}
      <p className={styles.taskPrompt}>
        {prompt}
        {audio && <SpeakButton text={audio} />}
      </p>
      <div className={styles.options}>
        {options.map((o, i) => {
          const cls = [styles.option, solved && i === answer && styles.optionRight, !solved && wrong === i && styles.optionWrong]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={solved}
              lang={/[а-яё]/i.test(o) ? undefined : 'el'}
              onClick={() => (i === answer ? onSolved() : setWrong(i))}
            >
              {o}
            </button>
          );
        })}
      </div>
      {solved ? <Solved /> : wrong !== null && <p className={styles.hintWrong}>Не то — попробуйте ещё раз.</p>}
    </>
  );
}
