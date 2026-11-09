import type { ReactNode } from 'react';
import type { Combination } from '../model/types';
import styles from './Alphabet.module.css';

interface Props {
  combinations: Combination[];
  renderSpeak?: (greek: string) => ReactNode;
  renderWord?: (greek: string, russian: string) => ReactNode;
}

/** Сочетания букв: как читаются, правило, примеры с чтением. */
export function CombinationList({ combinations, renderSpeak, renderWord }: Props) {
  return (
    <div className={styles.combos}>
      {combinations.map((c) => (
        <section key={c.letters} className={styles.combo}>
          <div className={styles.comboHead}>
            <span className={styles.comboLetters} lang="el">
              {c.letters}
            </span>
            <span className={styles.comboSound}>→ [{c.sound}]</span>
          </div>
          <p className={styles.rule}>{c.rule}</p>
          <ul className={styles.examples}>
            {c.examples.map((e) => (
              <li key={e.greek}>
                <span lang="el" className={styles.exampleGreek}>
                  {renderWord ? renderWord(e.greek, e.russian) : e.greek}
                </span>
                {renderSpeak?.(e.greek)}
                <span className={styles.reading}>[{e.reading}]</span>
                <span className={styles.translation}>{e.russian}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
