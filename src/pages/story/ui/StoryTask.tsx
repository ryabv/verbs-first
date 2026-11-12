import { useState, type FormEvent } from 'react';
import type { StoryGap, StoryLevel, StoryStep } from '@/entities/story';
import { SpeakButton } from '@/features/pronounce';
import { compareAnswer, type AnswerVerdict } from '@/shared/lib/greek';
import { Button } from '@/shared/ui/button';
import { Check } from '@/shared/ui/ornament';
import { Rich } from './Rich';
import { storyDeck } from '../lib/deck';
import styles from './Story.module.css';

interface Props {
  step: StoryStep;
  /** Уровень: тот же текст, разная форма задания (см. STORY_LEVELS). */
  level: StoryLevel;
  /** Значение слова пропуска по-русски — подсказка сложного уровня. */
  meaningOf: (gap: StoryGap) => string | undefined;
  solved: boolean;
  onSolved: () => void;
  /** Для «нажмите слова»: проверка выбранного (состояние выбора — у страницы, слова — в тексте). */
  tap?: { count: number; check: () => boolean };
}

/**
 * Задача шага: пропуски, выбор слов в тексте, выбор варианта.
 * Пропуск: лёгкий — выбрать из вариантов, средний — вписать с подсказкой, сложный — вписать без неё.
 * Реплика на слух: на сложном — записать услышанное (диктант), на остальных — выбрать.
 */
export function StoryTask({ step, level, meaningOf, solved, onSolved, tap }: Props) {
  const task = step.task;
  if (!task) return null;

  return (
    <section className={styles.task}>
      <h3 className={styles.taskTitle}>Задание</h3>
      {task.kind === 'gap' &&
        (level === 'light' ? (
          <GapChoice key={step.id} gaps={task.gaps} solved={solved} onSolved={onSolved} />
        ) : (
          <GapTask
            key={step.id}
            gaps={task.gaps}
            hintOf={level === 'medium' ? (g) => g.hint : (g) => meaningOf(g) && `«${meaningOf(g)}»`}
            solved={solved}
            onSolved={onSolved}
          />
        ))}
      {task.kind === 'tap' && tap && <TapTask key={step.id} prompt={task.prompt} answer={task.answer} solved={solved} onSolved={onSolved} {...tap} />}
      {task.kind === 'choose' && task.audio && level === 'hard' && (
        <Dictation key={step.id} audio={task.audio} answer={task.options[task.answer]!} solved={solved} onSolved={onSolved} />
      )}
      {task.kind === 'choose' && !(task.audio && level === 'hard') && (
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

/** Лёгкий уровень: каждый пропуск — выбор из вариантов. */
function GapChoice({ gaps, solved, onSolved }: { gaps: StoryGap[]; solved: boolean; onSolved: () => void }) {
  // Какие пропуски уже угаданы и какой вариант был неверным (по пропуску).
  const [right, setRight] = useState<ReadonlySet<number>>(() => new Set());
  const [wrong, setWrong] = useState<ReadonlyMap<number, string>>(() => new Map());
  const pick = (i: number, option: string) => {
    if (option !== gaps[i]!.word) {
      setWrong((m) => new Map(m).set(i, option));
      return;
    }
    const next = new Set(right).add(i);
    setRight(next);
    if (next.size === gaps.length) onSolved();
  };
  return (
    <>
      <p className={styles.taskPrompt}>{gaps.length > 1 ? 'Выберите слово для каждого пропуска:' : 'Выберите слово для пропуска:'}</p>
      <div className={styles.gaps}>
        {gaps.map((g, i) => {
          const done = solved || right.has(i);
          return (
            <div key={i} className={styles.gapField}>
              <span className={styles.gapHint}>
                {gaps.length > 1 && <b>{i + 1}. </b>}
                <Rich text={g.hint} wordDeck={storyDeck} />
              </span>
              <div className={styles.options} lang="el">
                {g.options.map((o) => {
                  const cls = [styles.option, done && o === g.word && styles.optionRight, !done && wrong.get(i) === o && styles.optionWrong]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button key={o} type="button" className={cls} disabled={done} onClick={() => pick(i, o)}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {solved ? <Solved /> : wrong.size > 0 && <p className={styles.hintWrong}>Не то — посмотрите на объяснение выше.</p>}
    </>
  );
}

/** Средний уровень — подсказка «начальная форма, лицо»; сложный — только значение по-русски, форму ученик выводит сам. */
function GapTask({
  gaps,
  hintOf,
  solved,
  onSolved,
}: {
  gaps: StoryGap[];
  hintOf: (gap: StoryGap) => string | undefined;
  solved: boolean;
  onSolved: () => void;
}) {
  const [values, setValues] = useState(() => gaps.map(() => ''));
  const [verdicts, setVerdicts] = useState<(AnswerVerdict | null)[]>(() => gaps.map(() => null));

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
              <Rich text={hintOf(g) ?? 'пропуск'} wordDeck={storyDeck} />
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
              aria-label={`Пропуск ${i + 1}: ${hintOf(g) ?? ''}`}
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

/** Сложный уровень, реплика на слух: записать, что сказали (диктант). Ошибка только в ударении — засчитана. */
function Dictation({ audio, answer, solved, onSolved }: { audio: string; answer: string; solved: boolean; onSolved: () => void }) {
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = compareAnswer(value, [answer]);
    setVerdict(v);
    if (v !== 'wrong') onSolved();
  };
  return (
    <form onSubmit={submit}>
      <p className={styles.taskPrompt}>
        Прослушайте и запишите по-гречески, что сказали.
        <SpeakButton text={audio} />
      </p>
      <input
        className={[styles.input, styles.inputWide, verdict === 'wrong' && styles.inputWrong].filter(Boolean).join(' ')}
        value={solved ? answer : value}
        readOnly={solved}
        onChange={(e) => setValue(e.target.value)}
        lang="el"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Что сказали"
      />
      {solved ? (
        <>
          <Solved />
          {verdict === 'accent' && <p className={styles.hintWrong}>Проверьте ударение: правильно — {answer}</p>}
        </>
      ) : (
        <div className={styles.taskActions}>
          <Button type="submit">Проверить</Button>
          {verdict === 'wrong' && <span className={styles.hintWrong}>Не совсем — послушайте ещё раз.</span>}
        </div>
      )}
    </form>
  );
}
