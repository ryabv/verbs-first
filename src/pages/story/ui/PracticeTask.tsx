import { useState, type FormEvent, type ReactNode } from 'react';
import type { PracticeTask as Task, StoryChapter, StoryLevel } from '@/entities/story';
import { analyzePhrase } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { compareAnswer, type AnswerVerdict } from '@/shared/lib/greek';
import { Button } from '@/shared/ui/button';
import { Check } from '@/shared/ui/ornament';
import { shuffle, tapCorrect, tilesOf } from '../lib/task';
import styles from './Story.module.css';

interface Props {
  chapter: StoryChapter;
  task: Task;
  /** Уровень: то же задание, разная форма (матрица в docs/product/tasks.md). */
  level: StoryLevel;
  /** Решено (или показан ответ): поля только для чтения, верный ответ виден. */
  solved: boolean;
  onSolved: () => void;
}

/**
 * Задание закрепления главы. Упражнение: слова без перевода — не подсказываем ответ.
 * Ошибиться можно сколько угодно; «Показать ответ» — у карточки задания (PracticePage).
 */
export function PracticeTask(props: Props) {
  const { task } = props;
  switch (task.kind) {
    case 'gap':
      return <GapPractice {...props} task={task} />;
    case 'tap':
      return <TapPractice {...props} task={task} />;
    case 'choose':
      return <ChoosePractice {...props} task={task} />;
    case 'listen':
      return <ListenPractice {...props} task={task} />;
    case 'translate':
      return <TranslatePractice {...props} task={task} />;
  }
}

type Of<K extends Task['kind']> = Omit<Props, 'task'> & { task: Extract<Task, { kind: K }> };

/** Порядок показа вариантов — перемешан один раз (в данных верный часто первый). */
function useOrder(n: number): number[] {
  const [order] = useState(() => shuffle(Array.from({ length: n }, (_, i) => i)));
  return order;
}

function Solved() {
  return (
    <p className={styles.solved}>
      <Check /> Верно.
    </p>
  );
}

/** Предложение главы с пропуском на месте слова. */
function GapSentence({ greek, word, fill }: { greek: string; word: string; fill: ReactNode }) {
  const tokens = analyzePhrase(greek);
  const at = tokens.findIndex((t) => t.isWord && t.text === word);
  return (
    <p className={styles.practiceSentence} lang="el">
      {tokens.map((t, i) => {
        if (i === at) {
          return (
            <span key={i} className={styles.gap}>
              {fill}
            </span>
          );
        }
        return <span key={i}>{t.text}</span>;
      })}
    </p>
  );
}

/** Выбор варианта: кнопки, неверный подсвечивается, верный — после решения. */
function Options({
  options,
  answer,
  solved,
  onSolved,
  greek,
}: {
  options: readonly string[];
  answer: number;
  solved: boolean;
  onSolved: () => void;
  greek?: boolean;
}) {
  const order = useOrder(options.length);
  const [wrong, setWrong] = useState<number | null>(null);
  return (
    <>
      <div className={styles.options} lang={greek ? 'el' : undefined}>
        {order.map((i) => {
          const cls = [styles.option, solved && i === answer && styles.optionRight, !solved && wrong === i && styles.optionWrong]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={i} type="button" className={cls} disabled={solved} onClick={() => (i === answer ? onSolved() : setWrong(i))}>
              {options[i]}
            </button>
          );
        })}
      </div>
      {solved ? <Solved /> : wrong !== null && <p className={styles.hintWrong}>Не то — попробуйте ещё раз.</p>}
    </>
  );
}

/** Поле ввода по-гречески с проверкой. Ошибка только в ударении — засчитана, с подсказкой. */
function Write({
  accepted,
  hint,
  solved,
  onSolved,
  wide,
  label,
}: {
  accepted: readonly string[];
  hint?: ReactNode;
  solved: boolean;
  onSolved: () => void;
  wide?: boolean;
  label: string;
}) {
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = compareAnswer(value, accepted);
    setVerdict(v);
    if (v !== 'wrong') onSolved();
  };
  return (
    <form onSubmit={submit} className={styles.gapField}>
      {hint && <span className={styles.gapHint}>{hint}</span>}
      <input
        className={[styles.input, wide && styles.inputWide, verdict === 'wrong' && styles.inputWrong].filter(Boolean).join(' ')}
        value={solved && verdict !== 'accent' && verdict !== 'correct' ? accepted[0] : value}
        readOnly={solved}
        onChange={(e) => {
          setValue(e.target.value);
          setVerdict(null);
        }}
        lang="el"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
      />
      {solved ? (
        <>
          <Solved />
          {verdict === 'accent' && <p className={styles.hintWrong}>Проверьте ударение: правильно — {accepted[0]}</p>}
        </>
      ) : (
        <div className={styles.taskActions}>
          <Button type="submit" disabled={!value.trim()}>
            Проверить
          </Button>
          {verdict === 'wrong' && <span className={styles.hintWrong}>Не совсем — попробуйте ещё раз.</span>}
        </div>
      )}
    </form>
  );
}

/** Пропуск: лёгкий — выбрать, средний — вписать с подсказкой «начальная форма, лицо», сложный — со значением по-русски. */
function GapPractice({ chapter, task, level, solved, onSolved }: Of<'gap'>) {
  const greek = chapter.sentences[task.sentence - 1]?.greek ?? '';
  return (
    <>
      <p className={styles.taskPrompt}>{level === 'light' ? 'Выберите слово для пропуска:' : 'Впишите слово в пропуск:'}</p>
      <GapSentence greek={greek} word={task.word} fill={solved ? task.word : '…'} />
      {level === 'light' ? (
        <Options options={task.options} answer={task.options.indexOf(task.word)} solved={solved} onSolved={onSolved} greek />
      ) : (
        <Write
          accepted={[task.word]}
          hint={level === 'medium' ? task.hint : `«${task.meaning}»`}
          label="Слово в пропуск"
          solved={solved}
          onSolved={onSolved}
        />
      )}
    </>
  );
}

/** Нажать слова в куске главы. Лёгкий — сказано, сколько слов нужно. */
function TapPractice({ chapter, task, level, solved, onSolved }: Of<'tap'>) {
  const [picked, setPicked] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [checked, setChecked] = useState(false);
  const answer = new Set(task.answer);
  const toggle = (id: string, text: string) => {
    if (solved) return;
    setChecked(false);
    setPicked((m) => {
      const next = new Map(m);
      if (next.has(id)) next.delete(id);
      else next.set(id, text);
      return next;
    });
  };
  const check = () => {
    setChecked(true);
    if (tapCorrect([...picked.values()], task.answer)) onSolved();
  };
  const sentences = chapter.sentences.slice(task.sentences[0] - 1, task.sentences[1]);
  return (
    <>
      <p className={styles.taskPrompt}>
        {task.prompt}
        {level === 'light' && ` Нужно слов: ${task.answer.length}.`}
      </p>
      <div className={styles.practiceSentence} lang="el">
        {sentences.map((s, si) => (
          <p key={si} className={styles.practiceLine}>
            {analyzePhrase(s.greek).map((t, ti) => {
              if (!t.isWord) return <span key={ti}>{t.text}</span>;
              const id = `${si}:${ti}`;
              const isPicked = picked.has(id) || (solved && answer.has(t.text));
              const right = answer.has(t.text);
              const cls = [
                styles.tapWord,
                isPicked && styles.tapPicked,
                (checked || solved) && isPicked && (right ? styles.tapRight : styles.tapWrong),
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button key={ti} type="button" className={cls} aria-pressed={isPicked} disabled={solved} onClick={() => toggle(id, t.text)}>
                  {t.text}
                </button>
              );
            })}
          </p>
        ))}
      </div>
      {solved ? (
        <Solved />
      ) : (
        <div className={styles.taskActions}>
          <Button disabled={picked.size === 0} onClick={check}>
            Проверить
          </Button>
          {picked.size > 0 && (
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setPicked(new Map());
                setChecked(false);
              }}
            >
              Снять выбор
            </button>
          )}
          {checked && <span className={styles.hintWrong}>Не совсем: лишнее отмечено красным — или найдено не всё.</span>}
        </div>
      )}
    </>
  );
}

/** Вопрос по тексту. Кусок главы перед глазами — только по-гречески: перевод выдал бы ответ. */
function ChoosePractice({ chapter, task, solved, onSolved }: Of<'choose'>) {
  const part = task.sentences && chapter.sentences.slice(task.sentences[0] - 1, task.sentences[1]);
  return (
    <>
      {part && (
        <div className={styles.practiceSentence}>
          {part.map((s, i) => (
            <p key={i} className={styles.practiceLine}>
              <span lang="el">{s.greek}</span>
            </p>
          ))}
        </div>
      )}
      <p className={styles.taskPrompt}>{task.prompt}</p>
      <Options options={task.options} answer={task.answer} solved={solved} onSolved={onSolved} greek={/^[^а-яё]*$/i.test(task.options[0] ?? '')} />
    </>
  );
}

/** На слух: лёгкий — выбрать написанное, средний — выбрать смысл, сложный — записать (диктант). */
function ListenPractice({ task, level, solved, onSolved }: Of<'listen'>) {
  return (
    <>
      <p className={styles.taskPrompt}>
        {level === 'light' && 'Прослушайте и выберите, что сказали.'}
        {level === 'medium' && 'Прослушайте и выберите, что это значит.'}
        {level === 'hard' && 'Прослушайте и запишите по-гречески, что сказали.'}
        <SpeakButton text={task.audio} />
      </p>
      {level === 'light' && <Options options={task.options} answer={task.answer} solved={solved} onSolved={onSolved} greek />}
      {level === 'medium' && <Options options={task.meanings} answer={task.answer} solved={solved} onSolved={onSolved} />}
      {level === 'hard' && <Write accepted={[task.audio]} label="Что сказали" wide solved={solved} onSolved={onSolved} />}
    </>
  );
}

/** Перевод на греческий: лёгкий — собрать из плиток, средний — вписать с подсказкой, сложный — вписать. */
function TranslatePractice({ task, level, solved, onSolved }: Of<'translate'>) {
  return (
    <>
      <p className={styles.taskPrompt}>
        {level === 'light' ? 'Соберите по-гречески:' : 'Переведите на греческий:'} <b>{task.russian}</b>
      </p>
      {level === 'light' ? (
        <Tiles greek={task.greek} decoys={task.decoys} solved={solved} onSolved={onSolved} />
      ) : (
        <Write accepted={task.greek} hint={level === 'medium' ? task.hint : undefined} label="Перевод" wide solved={solved} onSolved={onSolved} />
      )}
    </>
  );
}

/**
 * Плитки (`tiles`): нажатие переносит слово в строку ответа и обратно. Регистр и знаки не важны.
 * Плитки — из эталона (greek[0]) и лишних; засчитывается любой верный порядок из greek.
 */
function Tiles({ greek, decoys, solved, onSolved }: { greek: readonly string[]; decoys: readonly string[]; solved: boolean; onSolved: () => void }) {
  const target = tilesOf(greek[0]!);
  const [pool] = useState(() => shuffle([...target, ...decoys].map((w) => w.toLowerCase())));
  // Номера плиток из pool в порядке ответа.
  const [line, setLine] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const check = () => {
    const ok = compareAnswer(line.map((i) => pool[i]).join(' '), greek) !== 'wrong';
    if (ok) onSolved();
    else setWrong(true);
  };
  const shown = solved ? target : line.map((i) => pool[i]!);
  return (
    <>
      <div className={styles.tileLine} lang="el" aria-label="Ответ">
        {shown.length === 0 && <span className={styles.gapHint}>Нажимайте слова ниже по порядку.</span>}
        {solved
          ? shown.map((w, k) => (
              <span key={k} className={`${styles.tile} ${styles.optionRight}`}>
                {w}
              </span>
            ))
          : line.map((i, k) => (
              <button
                key={k}
                type="button"
                className={styles.tile}
                onClick={() => {
                  setWrong(false);
                  setLine((l) => l.filter((_, j) => j !== k));
                }}
              >
                {pool[i]}
              </button>
            ))}
      </div>
      {!solved && (
        <div className={styles.options} lang="el">
          {pool.map((w, i) => (
            <button
              key={i}
              type="button"
              className={styles.tile}
              disabled={line.includes(i)}
              onClick={() => {
                setWrong(false);
                setLine((l) => [...l, i]);
              }}
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {solved ? (
        <Solved />
      ) : (
        <div className={styles.taskActions}>
          <Button disabled={line.length === 0} onClick={check}>
            Проверить
          </Button>
          {wrong && <span className={styles.hintWrong}>Не совсем — поменяйте порядок или слова.</span>}
        </div>
      )}
    </>
  );
}
