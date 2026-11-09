import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { SentenceItem } from '@/entities/lesson';
import { SpeakButton } from '@/features/pronounce';
import { compareAnswer, type AnswerVerdict } from '@/shared/lib/greek';
import { speak } from '@/shared/lib/speech';
import { Button } from '@/shared/ui/button';
import { GreekKeyboard, useGreekKeyboard } from '@/shared/ui/greek-keyboard';
import { SpeakerIcon } from '@/shared/ui/icon';
import { useQueue } from '../model/useQueue';
import styles from './SentenceTrainer.module.css';

export type TrainerMode = 'translate' | 'dictation' | 'oral';

interface Props {
  mode: TrainerMode;
  items: readonly SentenceItem[];
  /** Вызывается, когда все фразы решены. */
  onComplete?: () => void;
}

const VERDICT_TEXT: Record<AnswerVerdict, string> = {
  correct: 'Верно!',
  accent: 'Почти! Проверьте ударение',
  wrong: 'Пока нет — эта фраза вернётся через пару заданий',
};

/** Тренировка целыми фразами: перевод, диктант или проговаривание вслух. */
export function SentenceTrainer({ mode, items, onComplete }: Props) {
  const queue = useQueue(items.length);
  const item = queue.current === undefined ? undefined : items[queue.current];

  useEffect(() => {
    if (queue.finished) onComplete?.();
  }, [queue.finished, onComplete]);

  return (
    <div className={styles.trainer}>
      <div className={styles.goal}>
        <div className={styles.goalBar}>
          <div className={styles.goalFill} style={{ width: `${(queue.solved / items.length) * 100}%` }} />
        </div>
        <span>
          {queue.solved} / {items.length}
        </span>
      </div>

      {item ? (
        mode === 'oral' ? (
          <OralCard key={`${queue.current}-${queue.mistakes}`} item={item} onResult={queue.resolve} />
        ) : (
          <WrittenCard key={`${queue.current}-${queue.mistakes}`} mode={mode} item={item} onResult={queue.resolve} />
        )
      ) : (
        <div className={styles.card}>
          <div className={styles.done}>
            Готово! Все {items.length} фраз
            {queue.mistakes === 0 ? ' — без единой ошибки.' : `, повторов после ошибок: ${queue.mistakes}.`}
          </div>
          <Button variant="secondary" onClick={queue.restart}>
            Пройти ещё раз
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------- письменные режимы: перевод и диктант ----------

interface CardProps {
  item: SentenceItem;
  onResult: (ok: boolean) => void;
}

function WrittenCard({ mode, item, onResult }: CardProps & { mode: 'translate' | 'dictation' }) {
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboard = useGreekKeyboard();

  // Фокус в поле при открытии (на телефоне — только если ученик уже печатал, см. useGreekKeyboard).
  useEffect(() => {
    if (keyboard.autoFocus) inputRef.current?.focus();
  }, [keyboard.autoFocus]);
  const expected = item.greek[0] ?? '';

  // Диктант: сразу проигрываем фразу (после клика «Дальше» браузер это разрешает).
  useEffect(() => {
    if (mode === 'dictation') void speak(expected);
  }, [mode, expected]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (verdict) {
      onResult(verdict !== 'wrong');
      return;
    }
    if (!answer.trim()) return;
    setVerdict(compareAnswer(answer, item.greek));
    inputRef.current?.focus();
  };

  return (
    <div className={styles.card}>
      <div className={styles.meta}>{mode === 'translate' ? 'Переведите на греческий' : 'Запишите, что услышали'}</div>

      {mode === 'translate' ? (
        <div className={styles.prompt}>{item.russian}</div>
      ) : (
        <div className={styles.listen}>
          <Button variant="secondary" onClick={() => void speak(expected)}>
            <SpeakerIcon className={styles.icon} /> Прослушать ещё раз
          </Button>
        </div>
      )}

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
          {verdict ? 'Дальше' : 'Проверить'}
        </Button>
      </form>

      {verdict && (
        <div className={`${styles.result} ${styles[verdict]}`}>
          <strong>{VERDICT_TEXT[verdict]}</strong>
          <div className={styles.expected}>
            <span lang="el">{expected}</span>
            <SpeakButton text={expected} />
          </div>
          {mode === 'dictation' && <div className={styles.translation}>{item.russian}</div>}
          {verdict === 'wrong' && item.greek.length > 1 && (
            <div className={styles.translation}>Тоже верно: {item.greek.slice(1).join(' · ')}</div>
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
  );
}

// ---------- устный режим: самопроверка ----------

function OralCard({ item, onResult }: CardProps) {
  const [revealed, setRevealed] = useState(false);
  const expected = item.greek[0] ?? '';

  return (
    <div className={styles.card}>
      <div className={styles.meta}>Скажите вслух по-гречески</div>
      <div className={styles.prompt}>{item.russian}</div>

      {revealed ? (
        <>
          <div className={styles.answer}>
            <span lang="el">{expected}</span>
            <SpeakButton text={expected} />
          </div>
          <div className={styles.selfCheck}>
            <Button onClick={() => onResult(true)}>Сказал(а) верно</Button>
            <Button variant="secondary" onClick={() => onResult(false)}>
              Ошибся(лась) — повторить позже
            </Button>
          </div>
        </>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            setRevealed(true);
            void speak(expected);
          }}
        >
          Показать ответ
        </Button>
      )}
    </div>
  );
}
