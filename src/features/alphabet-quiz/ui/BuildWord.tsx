import { useEffect, useRef, useState } from 'react';
import type { ReadingExample } from '@/entities/alphabet';
import { speak, useSpeechPending } from '@/shared/lib/speech';
import { Button } from '@/shared/ui/button';
import { SpeakerIcon } from '@/shared/ui/icon';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './Reading.module.css';

/** После скольких неудачных попыток показать слово. */
const HINT_AFTER = 2;

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

interface Props {
  words: readonly ReadingExample[];
  /** Лишние буквы-ловушки: добавляются к буквам слова. */
  extra: string;
  onComplete?: () => void;
}

/** «Собери слово»: слово звучит и написано русскими буквами — собрать его из плиток. */
export function BuildWord({ words, extra, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const next = () => {
    if (index + 1 >= words.length) onComplete?.();
    setIndex((i) => i + 1);
  };
  const restart = () => {
    setIndex(0);
    setMistakes(0);
    setRound((r) => r + 1);
  };

  const word = words[index];
  return (
    <div className={styles.build}>
      <div className={styles.progress}>
        <ProgressBar value={Math.min(index, words.length) / words.length} />
        <span>
          {Math.min(index, words.length)} / {words.length}
        </span>
      </div>
      {word ? (
        <Puzzle key={`${round}-${index}`} word={word} extra={extra} onSolved={next} onMistake={() => setMistakes((m) => m + 1)} />
      ) : (
        <div className={styles.card}>
          <div className={styles.finish}>
            Все слова собраны! {mistakes === 0 ? 'Без единой ошибки.' : `Неудачных попыток: ${mistakes}.`}
          </div>
          <Button variant="secondary" onClick={restart}>
            Ещё раз
          </Button>
        </div>
      )}
    </div>
  );
}

interface PuzzleProps {
  word: ReadingExample;
  extra: string;
  onSolved: () => void;
  onMistake: () => void;
}

function Puzzle({ word, extra, onSolved, onMistake }: PuzzleProps) {
  const pending = useSpeechPending(word.greek);
  const target = [...word.greek.normalize('NFC')];
  const [tiles] = useState(() => shuffle([...target, ...extra.normalize('NFC')]));
  /** Индексы плиток в порядке выбора. */
  const [picked, setPicked] = useState<number[]>([]);
  const [fails, setFails] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  const answer = picked.map((i) => tiles[i]).join('');
  const full = picked.length === target.length;
  const solved = full && answer === target.join('');
  const wrong = full && !solved;

  useEffect(() => {
    void speak(word.greek);
  }, [word.greek]);
  useEffect(() => {
    if (solved) nextRef.current?.focus();
  }, [solved]);

  const take = (i: number) => {
    if (full) return;
    const next = [...picked, i];
    setPicked(next);
    if (next.length < target.length) return;
    // Слово собрано: верно — слушаем ещё раз, нет — считаем попытку.
    if (next.map((k) => tiles[k]).join('') === target.join('')) void speak(word.greek);
    else {
      setFails((f) => f + 1);
      onMistake();
    }
  };
  const giveBack = (pos: number) => !solved && setPicked((p) => p.filter((_, k) => k !== pos));

  return (
    <div className={styles.card}>
      <div className={styles.task}>
        <button type="button" className={styles.listen} onClick={() => void speak(word.greek)} aria-label="Послушать ещё раз" aria-busy={pending}>
          <SpeakerIcon pending={pending} />
        </button>
        <div>
          <div className={styles.taskReading}>[{word.reading}]</div>
          <div className={styles.taskRussian}>{word.russian}</div>
        </div>
      </div>

      <div
        className={[styles.answer, solved && styles.answerOk, wrong && styles.answerBad].filter(Boolean).join(' ')}
        lang="el"
        aria-live="polite"
      >
        {target.map((_, pos) => {
          const tile = picked[pos];
          return tile === undefined ? (
            <span key={pos} className={styles.slot} />
          ) : (
            <button key={pos} type="button" className={styles.slotFilled} onClick={() => giveBack(pos)} disabled={solved}>
              {tiles[tile]}
            </button>
          );
        })}
      </div>

      <div className={styles.tiles} lang="el">
        {tiles.map((t, i) => (
          <button
            key={i}
            type="button"
            className={styles.tile}
            disabled={picked.includes(i) || full}
            onClick={() => take(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {wrong && (
        <div className={`${styles.result} ${styles.resultBad}`}>
          <strong>Не совсем.</strong>{' '}
          {fails >= HINT_AFTER ? (
            <>
              Правильно: <span lang="el">{word.greek}</span>
            </>
          ) : (
            'Нажмите на неверную букву, чтобы вернуть её, или начните заново.'
          )}
          <div>
            <Button variant="secondary" className={styles.next} onClick={() => setPicked([])}>
              Заново
            </Button>
          </div>
        </div>
      )}
      {solved && (
        <>
          <div className={`${styles.result} ${styles.resultOk}`}>
            <strong>Верно!</strong> <span lang="el">{word.greek}</span> — {word.russian}
          </div>
          <Button ref={nextRef} className={styles.next} onClick={onSolved}>
            Дальше
          </Button>
        </>
      )}
    </div>
  );
}
