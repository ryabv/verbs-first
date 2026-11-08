import type { ReactNode } from 'react';
import type { Phrase } from '../model/types';
import styles from './Lesson.module.css';

interface Props {
  phrases: Phrase[];
  renderAction?: (greek: string) => ReactNode;
}

export function PhraseList({ phrases, renderAction }: Props) {
  return (
    <ul className={styles.phrases}>
      {phrases.map((phrase) => (
        <li key={phrase.greek}>
          <span className={styles.greek}>
            {phrase.greek}
            {renderAction?.(phrase.greek)}
          </span>
          <span className={styles.russian}>{phrase.russian}</span>
        </li>
      ))}
    </ul>
  );
}
