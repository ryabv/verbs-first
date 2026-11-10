import { useState, type CSSProperties, type ReactNode } from 'react';
import type { ReadingExample } from '@/entities/alphabet';
import { SpeakButton } from '@/features/pronounce';
import { speak } from '@/shared/lib/speech';
import { Button } from '@/shared/ui/button';
import styles from './Reading.module.css';

interface Props {
  words: readonly ReadingExample[];
  /** Слово после проверки: по тапу — в карточки (слот из features/card-add). */
  renderWord: (greek: string, russian: string) => ReactNode;
}

/**
 * Лесенка слов: каждое следующее чуть длиннее. Ученик читает сам, потом нажимает —
 * видит чтение и перевод, слышит слово.
 */
export function WordLadder({ words, renderWord }: Props) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());

  const reveal = (i: number) => {
    const word = words[i]!;
    void speak(word.plain ?? word.greek);
    setOpen((s) => new Set(s).add(i));
  };

  return (
    <div>
      <ol className={styles.ladder}>
        {words.map((w, i) => {
          // Ступенька: каждое слово чуть правее предыдущего.
          const style = { '--step': i / Math.max(1, words.length - 1) } as CSSProperties;
          return (
            <li key={w.greek} className={styles.rung} style={style}>
              {open.has(i) ? (
                <div className={`${styles.rungCard} ${styles.rungOpen}`}>
                  {w.plain && (
                    <span className={styles.rungGreek} lang="el">
                      {w.greek} =
                    </span>
                  )}
                  <span className={styles.rungGreek}>{renderWord(w.plain ?? w.greek, w.russian)}</span>
                  <SpeakButton text={w.plain ?? w.greek} />
                  <span className={styles.rungReading}>[{w.reading}]</span>
                  <span className={styles.rungRussian}>{w.russian}</span>
                </div>
              ) : (
                <button type="button" className={styles.rungCard} onClick={() => reveal(i)}>
                  <span className={styles.rungGreek} lang="el">
                    {w.greek}
                  </span>
                  <span className={styles.rungHint}>проверить</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div className={styles.counter}>
        {open.size === words.length ? (
          'Все слова прочитаны. Нажмите на слово, чтобы добавить его в карточки.'
        ) : (
          <>
            Прочитано {open.size} из {words.length}
            {open.size > 0 && (
              <Button variant="ghost" onClick={() => setOpen(new Set(words.map((_, i) => i)))}>
                Показать все
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
