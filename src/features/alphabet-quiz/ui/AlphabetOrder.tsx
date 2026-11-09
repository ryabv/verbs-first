import { useEffect, useRef, useState } from 'react';
import { LETTERS, type Letter } from '@/entities/alphabet';
import { speak } from '@/shared/lib/speech';
import { Button } from '@/shared/ui/button';
import styles from './AlphabetOrder.module.css';

type Case = 'lower' | 'upper';

const BEST_KEY = 'verbs-first:alphabet-order:best';
/** После скольких ошибок на одной букве подсвечиваем правильную. */
const HINT_AFTER = 2;

interface Best {
  mistakes: number;
  ms: number;
}

function readBest(): Best | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? (JSON.parse(raw) as Best) : null;
  } catch {
    return null;
  }
}

function saveBest(best: Best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* приватный режим */
  }
}

const isBetter = (a: Best, b: Best | null) => !b || a.mistakes < b.mistakes || (a.mistakes === b.mistakes && a.ms < b.ms);

function shuffledIndexes(): number[] {
  const out = LETTERS.map((_, i) => i);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const formatTime = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Буква с клавиатуры → индекс в алфавите (без ударений, ς = σ). */
function letterIndex(key: string): number {
  const ch = key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace('ς', 'σ');
  // У сигмы строчная записана как «σ / ς».
  return LETTERS.findIndex((l) => l.lower.split(' / ').includes(ch));
}

const nameOf = (l: Letter) => l.speakAs ?? l.name;

/**
 * Тренажёр «Алфавит по порядку»: буквы перемешаны, нужно нажать их от α до ω.
 * Ошибка не останавливает — подсвечивается, а после двух ошибок подсказываем нужную букву.
 */
export function AlphabetOrder() {
  const [letterCase, setLetterCase] = useState<Case>('lower');
  const [showNames, setShowNames] = useState(false);
  const [order, setOrder] = useState(shuffledIndexes);
  const [next, setNext] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [hereMistakes, setHereMistakes] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<{ ms: number; record: boolean } | null>(null);
  const [best, setBest] = useState<Best | null>(readBest);
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const done = next >= LETTERS.length;
  const glyph = (l: Letter) => (letterCase === 'lower' ? l.lower : l.upper);

  const restart = () => {
    setOrder(shuffledIndexes());
    setNext(0);
    setMistakes(0);
    setMissed(new Set());
    setHereMistakes(0);
    setWrong(null);
    setStartedAt(null);
    setResult(null);
  };

  const pick = (index: number) => {
    if (done || index < next) return;
    const start = startedAt ?? Date.now();
    if (startedAt === null) setStartedAt(start);

    if (index !== next) {
      setMistakes((m) => m + 1);
      setHereMistakes((m) => m + 1);
      setMissed((s) => new Set(s).add(next));
      setWrong(index);
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrong(null), 600);
      return;
    }

    void speak(nameOf(LETTERS[index]!));
    setWrong(null);
    setHereMistakes(0);
    setNext(index + 1);
    if (index + 1 === LETTERS.length) {
      const run: Best = { mistakes: mistakes, ms: Date.now() - start };
      const record = isBetter(run, best);
      if (record) {
        saveBest(run);
        setBest(run);
      }
      setResult({ ms: run.ms, record });
    }
  };

  // Клавиатура компьютера: можно печатать буквы по-гречески.
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      if (e.target instanceof Element && e.target.closest('input, textarea')) return;
      const index = letterIndex(e.key);
      if (index >= 0) pickRef.current(index);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(wrongTimer.current);
    };
  }, []);

  const hint = !done && hereMistakes >= HINT_AFTER ? next : null;

  return (
    <div className={styles.root}>
      <div className={styles.settings}>
        <fieldset className={styles.segmented}>
          <legend className={styles.legend}>Буквы</legend>
          {(['lower', 'upper'] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={letterCase === c ? styles.segActive : styles.seg}
              aria-pressed={letterCase === c}
              onClick={() => setLetterCase(c)}
            >
              {c === 'lower' ? 'α β γ строчные' : 'Α Β Γ заглавные'}
            </button>
          ))}
        </fieldset>
        <label className={styles.toggle}>
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          Названия на кнопках
        </label>
      </div>

      <ol className={styles.sequence} aria-label="Собранный алфавит">
        {LETTERS.map((l, i) => (
          <li
            key={l.name}
            className={[styles.slot, i < next && styles.slotDone, i === next && styles.slotNext, missed.has(i) && i < next && styles.slotMissed]
              .filter(Boolean)
              .join(' ')}
            lang="el"
          >
            {i < next ? glyph(l) : i === next ? '?' : ''}
          </li>
        ))}
      </ol>

      {done && result ? (
        <div className={styles.finish}>
          <div className={styles.finishTitle}>
            Алфавит собран{mistakes === 0 ? ' без единой ошибки!' : '!'}
          </div>
          <div>
            Время {formatTime(result.ms)}, ошибок {mistakes}.{result.record && ' Это ваш лучший результат.'}
          </div>
          {missed.size > 0 && (
            <div className={styles.missed}>
              Повторите, где ошибались:{' '}
              <span lang="el">
                {[...missed]
                  .toSorted((a, b) => a - b)
                  .map((i) => glyph(LETTERS[i]!))
                  .join(' ')}
              </span>
            </div>
          )}
          <Button onClick={restart}>Ещё раз</Button>
        </div>
      ) : (
        <>
          <p className={styles.status}>
            {next === 0 ? 'Нажмите первую букву алфавита.' : `Дальше — ${next + 1}-я буква из ${LETTERS.length}.`}
            {mistakes > 0 && <span className={styles.mistakes}> Ошибок: {mistakes}</span>}
          </p>
          <div className={styles.grid}>
            {order.map((i) => {
              const l = LETTERS[i]!;
              const used = i < next;
              const cls = [styles.key, used && styles.keyUsed, wrong === i && styles.keyWrong, hint === i && styles.keyHint]
                .filter(Boolean)
                .join(' ');
              return (
                <button key={l.name} type="button" className={cls} disabled={used} onClick={() => pick(i)} lang="el">
                  <span className={styles.glyph}>{glyph(l)}</span>
                  {showNames && <span className={styles.name}>{l.nameRu}</span>}
                </button>
              );
            })}
          </div>
          {best && (
            <p className={styles.best}>
              Лучший результат: {formatTime(best.ms)}, ошибок {best.mistakes}
            </p>
          )}
        </>
      )}
    </div>
  );
}
