import { GREEK_PRONOUNS, RUSSIAN_PRONOUNS } from '../model/labels';
import { PERSONS, type Person } from '../model/types';
import styles from './PersonSwitcher.module.css';

interface PersonSwitcherProps {
  value: Person;
  onChange: (person: Person) => void;
}

export function PersonSwitcher({ value, onChange }: PersonSwitcherProps) {
  return (
    <div className={styles.switcher} role="radiogroup" aria-label="Лицо">
      {PERSONS.map((p) => (
        <button
          key={p}
          role="radio"
          aria-checked={p === value}
          className={p === value ? `${styles.chip} ${styles.active}` : styles.chip}
          onClick={() => onChange(p)}
        >
          <span>{GREEK_PRONOUNS[p]}</span>
          <small>{RUSSIAN_PRONOUNS[p]}</small>
        </button>
      ))}
    </div>
  );
}
