import { useEffect, useRef, useState } from 'react';
import type { QuizItem } from '@/entities/alphabet';
import { SpeakButton } from '@/features/pronounce';
import { speak } from '@/shared/lib/speech';
import { SpeakerIcon } from '@/shared/ui/icon';
import { Button } from '@/shared/ui/button';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './ChoiceQuiz.module.css';

const OPTIONS = 4;
const RETRY_GAP = 3;

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function optionsFor(item: QuizItem, all: readonly QuizItem[]): string[] {
  const pool = item.distractors ?? shuffle(all.map((i) => i.answer));
  const wrong = [...new Set(pool)].filter((a) => a !== item.answer).slice(0, OPTIONS - 1);
  return shuffle([item.answer, ...wrong]);
}

interface Props {
  items: readonly QuizItem[];
  /** Подпись к вопросу: «Какой звук?», «Как читается?». */
  question: string;
  /** Все вопросы решены (для прогресса раздела). */
  onComplete?: () => void;
  /** «Услышь и выбери»: вопрос звучит (prompt не показываем до ответа), варианты — по-гречески. */
  listen?: boolean;
}

/** Тренажёр с вариантами: каждый вопрос до верного ответа, ошибка возвращается через пару вопросов. */
export function ChoiceQuiz({ items, question, onComplete, listen = false }: Props) {
  const [round, setRound] = useState(0);
  const [queue, setQueue] = useState(() => shuffle(items.map((_, i) => i)));
  const [mistakes, setMistakes] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const restart = () => {
    setQueue(shuffle(items.map((_, i) => i)));
    setMistakes(0);
    setRound((r) => r + 1);
  };

  const resolve = (correct: boolean) => {
    const [head, ...rest] = queue;
    if (head === undefined) return;
    if (correct) {
      setQueue(rest);
      if (rest.length === 0) onComplete?.();
    } else {
      const at = Math.min(RETRY_GAP - 1, rest.length);
      setQueue([...rest.slice(0, at), head, ...rest.slice(at)]);
      setMistakes((m) => m + 1);
    }
    setAttempt((a) => a + 1);
  };

  const current = queue[0];
  const done = items.length - queue.length;

  return (
    <div className={styles.quiz}>
      <div className={styles.progress}>
        <ProgressBar value={done / items.length} />
        <span>
          {done} / {items.length}
        </span>
      </div>

      {current === undefined ? (
        <div className={styles.card}>
          <div className={styles.finish}>
            Готово! {mistakes === 0 ? 'Без единой ошибки.' : `Ошибок по ходу: ${mistakes}.`}
          </div>
          <Button variant="secondary" onClick={restart}>
            Ещё раз
          </Button>
        </div>
      ) : (
        <Question
          key={`${round}-${attempt}`}
          item={items[current]!}
          all={items}
          question={question}
          listen={listen}
          onResult={resolve}
        />
      )}
    </div>
  );
}

interface QuestionProps {
  item: QuizItem;
  all: readonly QuizItem[];
  question: string;
  listen: boolean;
  onResult: (correct: boolean) => void;
}

function Question({ item, all, question, listen, onResult }: QuestionProps) {
  const [options] = useState(() => optionsFor(item, all));
  const [picked, setPicked] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const correct = picked === item.answer;

  useEffect(() => {
    if (picked) nextRef.current?.focus();
  }, [picked]);

  const speakText = item.speak ?? item.prompt;
  // На слух: слово звучит сразу при появлении вопроса.
  useEffect(() => {
    if (listen) void speak(speakText);
  }, [listen, speakText]);

  return (
    <div className={styles.card}>
      <div className={styles.meta}>{question}</div>
      {listen ? (
        <div className={styles.prompt}>
          <button type="button" className={styles.listen} onClick={() => void speak(speakText)} aria-label="Послушать ещё раз">
            <SpeakerIcon />
          </button>
          {picked && <span lang="el">{item.prompt}</span>}
        </div>
      ) : (
        <div className={styles.prompt} lang="el">
          {item.prompt}
          {/* Озвучка — только после ответа, иначе она подсказывает. */}
          {picked && <SpeakButton text={speakText} />}
        </div>
      )}

      <div className={styles.options}>
        {options.map((option) => {
          const state = !picked
            ? ''
            : option === item.answer
              ? styles.right
              : option === picked
                ? styles.wrong
                : '';
          return (
            <button
              key={option}
              type="button"
              className={`${styles.option} ${state}`}
              lang={listen ? 'el' : undefined}
              disabled={picked !== null}
              onClick={() => setPicked(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {picked && (
        <>
          <div className={`${styles.result} ${correct ? styles.resultOk : styles.resultBad}`}>
            <strong>{correct ? 'Верно!' : `Правильно: ${item.answer}`}</strong>
            {item.note && <div className={styles.note}>{item.note}</div>}
          </div>
          <Button ref={nextRef} className={styles.next} onClick={() => onResult(correct)}>
            Дальше
          </Button>
        </>
      )}
    </div>
  );
}
