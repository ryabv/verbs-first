import { GREEK_PRONOUNS, TENSE_LABELS } from '../model/labels';
import { PERSONS, TENSES, type Verb } from '../model/types';
import styles from './VerbParadigm.module.css';

/** Полное спряжение: 6 лиц × 3 времени (утвердительная форма). */
export function VerbParadigm({ verb }: { verb: Verb }) {
  const formFor = (tense: (typeof TENSES)[number], person: (typeof PERSONS)[number]) =>
    tense === 'future' ? `θα ${verb.greek.perfective[person]}` : verb.greek[tense][person];

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th />
          {TENSES.map((t) => (
            <th key={t}>{TENSE_LABELS[t]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PERSONS.map((p) => (
          <tr key={p}>
            <th scope="row">{GREEK_PRONOUNS[p]}</th>
            {TENSES.map((t) => (
              <td key={t}>{formFor(t, p)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
