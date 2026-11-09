import type { ReactNode } from 'react';
import type { Phrase } from '../model/types';
import styles from './Lesson.module.css';

interface Props {
  phrases: Phrase[];
  renderAction?: (greek: string) => ReactNode;
  /** Слот для греческого текста (например, слово с добавлением в карточки). */
  renderGreek?: (greek: string, russian: string) => ReactNode;
}

export function PhraseList({ phrases, renderAction, renderGreek }: Props) {
  return (
    <ul className={styles.phrases}>
      {phrases.map((phrase) => (
        <li key={phrase.greek}>
          <span className={styles.greek}>
            {renderGreek ? renderGreek(phrase.greek, phrase.russian) : phrase.greek}
            {renderAction?.(phrase.greek)}
          </span>
          <span className={styles.russian}>{phrase.russian}</span>
        </li>
      ))}
    </ul>
  );
}
