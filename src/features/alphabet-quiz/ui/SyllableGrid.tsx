import { useState } from 'react';
import { syllableSpeech } from '@/entities/alphabet';
import type { Syllable } from '@/entities/lesson';
import { speak } from '@/shared/lib/speech';
import styles from './Reading.module.css';

/** Слоги рядами: прочитать самому, нажать — услышать и увидеть чтение. */
export function SyllableGrid({ rows }: { rows: readonly Syllable[][] }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const total = rows.flat().length;

  const tap = (greek: string) => {
    void speak(syllableSpeech(greek));
    setOpen((s) => new Set(s).add(greek));
  };

  return (
    <div className={styles.syllables}>
      {rows.map((row, i) => (
        <div key={i} className={styles.syllableRow}>
          {row.map(([greek, reading]) => {
            const shown = open.has(greek);
            return (
              <button
                key={greek}
                type="button"
                className={shown ? `${styles.syllable} ${styles.syllableOpen}` : styles.syllable}
                onClick={() => tap(greek)}
                aria-label={shown ? `${greek} — ${reading}` : `${greek}: проверить`}
              >
                <span lang="el" className={styles.syllableGreek}>
                  {greek}
                </span>
                <span className={styles.syllableReading}>{shown ? reading : '?'}</span>
              </button>
            );
          })}
        </div>
      ))}
      <div className={styles.counter}>
        {open.size === total ? 'Все слоги прочитаны — можно дальше.' : `Проверено ${open.size} из ${total}`}
      </div>
    </div>
  );
}
