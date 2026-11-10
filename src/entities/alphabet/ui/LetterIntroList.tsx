import type { ReactNode } from 'react';
import type { LetterIntro } from '@/entities/lesson/@x/alphabet';
import { LETTERS } from '../data/letters';
import styles from './Alphabet.module.css';

interface Props {
  letters: readonly LetterIntro[];
  renderSpeak?: (greek: string) => ReactNode;
  renderWord?: (greek: string, russian: string) => ReactNode;
}

/** Буква из алфавита по строчной: у сигмы строчных две (σ / ς). */
const letterOf = (char: string) => LETTERS.find((l) => l.lower === char || l.lower.startsWith(`${char} `));

/** Новые буквы этапа (курс чтения): звук, как запомнить, слово только из знакомых букв. */
export function LetterIntroList({ letters, renderSpeak, renderWord }: Props) {
  return (
    <ul className={styles.grid}>
      {letters.map((intro) => {
        const l = letterOf(intro.char);
        return (
          <li key={intro.char} className={styles.letter}>
            <div className={styles.letterHead}>
              <span className={styles.glyph} lang="el">
                {l ? `${l.upper} ${l.lower.replace(' / ', ' ')}` : intro.char}
              </span>
              <span className={styles.sound}>[{intro.sound}]</span>
            </div>
            {l && (
              <div className={styles.name}>
                <span lang="el">{l.name}</span> · {l.nameRu}
                {renderSpeak?.(l.speakAs ?? l.name)}
              </div>
            )}
            <div className={styles.tip}>{intro.tip}</div>
            <div className={styles.example}>
              <span lang="el" className={styles.exampleGreek}>
                {renderWord ? renderWord(intro.example.greek, intro.example.russian) : intro.example.greek}
              </span>
              {renderSpeak?.(intro.example.greek)}
              <span className={styles.reading}>[{intro.example.reading}]</span>
              <span className={styles.translation}>{intro.example.russian}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
