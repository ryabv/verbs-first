import type { ReactNode } from 'react';
import type { Letter } from '../model/types';
import styles from './Alphabet.module.css';

interface Props {
  letters: Letter[];
  /** Слот для кнопки озвучки (из features). */
  renderSpeak?: (greek: string) => ReactNode;
  /** Слот для слова-примера (например, с добавлением в карточки). */
  renderWord?: (greek: string, russian: string) => ReactNode;
}

/** Все буквы карточками: буква, название, звук, пример слова. */
export function LetterGrid({ letters, renderSpeak, renderWord }: Props) {
  return (
    <ul className={styles.grid}>
      {letters.map((l) => (
        <li key={l.upper} className={styles.letter}>
          <div className={styles.letterHead}>
            <span className={styles.glyph} lang="el">
              {l.upper} {l.lower}
            </span>
            <span className={styles.sound}>[{l.sound}]</span>
          </div>
          <div className={styles.name}>
            <span lang="el">{l.name}</span> · {l.nameRu}
            {renderSpeak?.(l.speakAs ?? l.name)}
          </div>
          {l.note && <div className={styles.note}>{l.note}</div>}
          <div className={styles.example}>
            <span lang="el" className={styles.exampleGreek}>
              {renderWord ? renderWord(l.example.greek, l.example.russian) : l.example.greek}
            </span>
            {renderSpeak?.(l.example.greek)}
            <span className={styles.reading}>[{l.example.reading}]</span>
            <span className={styles.translation}>{l.example.russian}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
