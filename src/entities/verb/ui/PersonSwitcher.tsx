import { GREEK_PRONOUNS, RUSSIAN_PRONOUNS } from '../model/labels';
import { PERSONS, type Person } from '../model/types';
import styles from './PersonSwitcher.module.css';

interface PersonSwitcherProps {
  value: Person;
  onChange: (person: Person) => void;
}

export function PersonSwitcher({ value, onChange }: PersonSwitcherProps) {
  return (
    <fieldset className={styles.switcher}>
      <legend className={styles.legend}>Лицо</legend>
      {PERSONS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={p === value}
          className={p === value ? `${styles.chip} ${styles.active}` : styles.chip}
          onClick={() => onChange(p)}
        >
          <span>{GREEK_PRONOUNS[p]}</span>
          <small>{RUSSIAN_PRONOUNS[p]}</small>
        </button>
      ))}
    </fieldset>
  );
}
