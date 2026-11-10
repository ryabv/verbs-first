import type { CSSProperties, ReactNode } from 'react';
import { buildGreek, buildRussian } from '../lib/buildPhrase';
import { FORM_LABELS, FORM_SIGNS, TENSE_LABELS } from '../model/labels';
import { SENTENCE_FORMS, TENSES, type Person, type SentenceForm, type Tense, type Verb } from '../model/types';
import styles from './VerbTable.module.css';

interface VerbTableProps {
  verb: Verb;
  person: Person;
  /** Слот для действия в ячейке (например, кнопка озвучки из features). */
  renderCellAction?: (greek: string) => ReactNode;
  /** Только эти строки и колонки (уже пройденные в уроке). Не задано — все. */
  tenses?: readonly Tense[];
  forms?: readonly SentenceForm[];
}

/** «Таблица умножения»: 3 времени × 3 формы для выбранного лица. */
export function VerbTable({ verb, person, renderCellAction, tenses, forms }: VerbTableProps) {
  const rows = tenses?.length ? TENSES.filter((t) => tenses.includes(t)) : TENSES;
  const cols = forms?.length ? SENTENCE_FORMS.filter((f) => forms.includes(f)) : SENTENCE_FORMS;
  return (
    <div className={styles.container}>
    <div className={styles.grid} style={{ '--cols': cols.length } as CSSProperties}>
      <div />
      {cols.map((form) => (
        <div key={form} className={styles.colHead}>
          <span className={styles.sign}>{FORM_SIGNS[form]}</span>
          <span>{FORM_LABELS[form]}</span>
        </div>
      ))}
      {rows.map((tense) => (
        <div key={tense} className={styles.row}>
          <div className={styles.rowHead}>{TENSE_LABELS[tense]}</div>
          {cols.map((form) => {
            const cell = { tense, form, person };
            const [greek = ''] = buildGreek(verb, cell);
            return (
              <div key={form} className={styles.cell}>
                <div className={styles.greek}>{greek}</div>
                {renderCellAction && <div className={styles.action}>{renderCellAction(greek)}</div>}
                <div className={styles.russian}>{buildRussian(verb, cell)}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
    </div>
  );
}
