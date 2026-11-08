import { Link, NavLink } from 'react-router';
import { ThemeSwitcher } from '@/features/theme-switcher';
import { routes } from '@/shared/config/routes';
import styles from './AppHeader.module.css';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <Link to={routes.home()} className={styles.logo}>
        <span className={styles.mark}>ρ</span>
        <span>
          Verbs<b>First</b>
        </span>
      </Link>
      <nav className={styles.nav}>
        <NavLink to={routes.home()} end className={({ isActive }) => (isActive ? styles.active : undefined)}>
          Уроки
        </NavLink>
      </nav>
      <div className={styles.tools}>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
