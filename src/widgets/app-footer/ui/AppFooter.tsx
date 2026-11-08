import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} Verbs First</span>
      <span>Греческий через глаголы · по принципам методики Д. Петрова</span>
    </footer>
  );
}
