import { useTheme } from '../model/theme';
import styles from './ThemeSwitcher.module.css';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className={styles.switcher}
      onClick={() => setTheme(next)}
      title={next === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
      aria-label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
