import { useThemeMode, type ThemeMode } from '../model/theme';
import styles from './ThemeChoice.module.css';

const MODES: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Как в системе' },
  { mode: 'light', label: 'Светлая' },
  { mode: 'dark', label: 'Тёмная' },
];

/** Выбор темы из трёх: «как в системе» (по умолчанию), светлая, тёмная. */
export function ThemeChoice() {
  const [mode, setMode] = useThemeMode();
  return (
    <fieldset className={styles.choice} aria-label="Тема">
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          aria-pressed={mode === m.mode}
          className={mode === m.mode ? `${styles.option} ${styles.on}` : styles.option}
          onClick={() => setMode(m.mode)}
        >
          {m.label}
        </button>
      ))}
    </fieldset>
  );
}
