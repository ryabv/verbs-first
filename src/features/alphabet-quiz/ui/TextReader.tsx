import { useState, type ReactNode } from 'react';
import type { ReadingExample } from '@/entities/alphabet';
import type { TextLook } from '@/entities/lesson';
import { SpeakButton } from '@/features/pronounce';
import { speak } from '@/shared/lib/speech';
import { Button } from '@/shared/ui/button';
import { SpeakerIcon } from '@/shared/ui/icon';
import styles from './TextReader.module.css';

const LOOK_LABELS: Record<TextLook, string> = {
  note: 'Записка',
  postcard: 'Открытка',
  announcement: 'Объявление',
  sign: 'Табличка',
};

interface Props {
  sentences: readonly ReadingExample[];
  look: TextLook;
  /** Строка после проверки: по тапу — в карточки целиком (слот из features/card-add). */
  renderWord: (greek: string, russian: string) => ReactNode;
}

/**
 * Короткий жизненный текст курса чтения. Сначала — весь текст, как он выглядит в жизни;
 * нажатие на строку открывает под ней чтение и перевод и озвучивает её.
 */
export function TextReader({ sentences, look, renderWord }: Props) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const whole = sentences.map((s) => s.greek).join(' ');

  const reveal = (i: number) => {
    void speak(sentences[i]!.greek);
    setOpen((s) => new Set(s).add(i));
  };

  return (
    <div>
      <figure className={`${styles.paper} ${styles[look]}`}>
        <figcaption className={styles.label}>{LOOK_LABELS[look]}</figcaption>
        <div className={styles.text} lang="el">
          {sentences.map((s, i) => (
            <span key={i} className={styles.line}>
              {open.has(i) ? <span className={styles.lineOpen}>{s.greek}</span> : (
                <button type="button" className={styles.lineBtn} onClick={() => reveal(i)}>
                  {s.greek}
                </button>
              )}
            </span>
          ))}
        </div>
      </figure>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => void speak(whole)}>
          <SpeakerIcon /> Послушать весь текст
        </Button>
        {open.size < sentences.length && (
          <Button variant="ghost" onClick={() => setOpen(new Set(sentences.map((_, i) => i)))}>
            Проверить всё сразу
          </Button>
        )}
      </div>

      {open.size > 0 && (
        <ol className={styles.check}>
          {sentences.map((s, i) =>
            open.has(i) ? (
              <li key={i}>
                <span className={styles.checkGreek}>{renderWord(s.greek, s.russian)}</span>
                <SpeakButton text={s.greek} />
                <span className={styles.checkReading}>[{s.reading}]</span>
                <span className={styles.checkRussian}>{s.russian}</span>
              </li>
            ) : null,
          )}
        </ol>
      )}
      <p className={styles.hint}>
        {open.size === sentences.length
          ? 'Вы прочитали настоящий греческий текст. Строку целиком можно добавить в карточки — нажмите на неё.'
          : 'Нажмите на строку в тексте, чтобы проверить себя.'}
      </p>
    </div>
  );
}
