import { GREEK_PRONOUNS, TENSE_LABELS } from '../model/labels';
import { PERSONS, TENSES, type Tense, type Verb } from '../model/types';
import styles from './VerbParadigm.module.css';

/** Полное спряжение: 6 лиц × 3 времени (утвердительная форма). */
export function VerbParadigm({ verb, tenses }: { verb: Verb; tenses?: readonly Tense[] }) {
  const cols = tenses?.length ? TENSES.filter((t) => tenses.includes(t)) : TENSES;
  const formFor = (tense: (typeof TENSES)[number], person: (typeof PERSONS)[number]) =>
    tense === 'future' ? `θα ${verb.greek.perfective[person]}` : verb.greek[tense][person];

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Лицо</th>
          {cols.map((t) => (
            <th key={t}>{TENSE_LABELS[t]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PERSONS.map((p) => (
          <tr key={p}>
            <th scope="row">{GREEK_PRONOUNS[p]}</th>
            {cols.map((t) => (
              <td key={t}>{formFor(t, p)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
