import styles from './AppFooter.module.css';

// Вычисляем один раз при загрузке: рендер должен быть чистым.
const YEAR = new Date().getFullYear();

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <span>© {YEAR} Verbs First</span>
      <span>Греческий через глаголы · по принципам методики Д. Петрова</span>
    </footer>
  );
}
