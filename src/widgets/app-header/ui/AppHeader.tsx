import { Link, NavLink } from 'react-router';
import { ThemeSwitcher } from '@/features/theme-switcher';
import { routes } from '@/shared/config/routes';
import { BookIcon, CardsIcon } from '@/shared/ui/icon';
import { Laurel, Meander, Scroll } from '@/shared/ui/ornament';
import styles from './AppHeader.module.css';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <Link to={routes.home()} className={styles.logo}>
        <span className={styles.mark}>
          <Laurel className={styles.wreath} size="100%" />
          <span className={styles.rho}>ρ</span>
        </span>
        <span className={styles.wordmark}>
          Verbs<b>First</b>
        </span>
      </Link>
      <nav className={styles.nav}>
        <NavLink to={routes.home()} end className={({ isActive }) => (isActive ? styles.active : undefined)}>
          <Scroll className={styles.navIcon} />
          Уроки
        </NavLink>
        <NavLink to={routes.cards()} className={({ isActive }) => (isActive ? styles.active : undefined)}>
          <CardsIcon className={styles.navIcon} />
          Карточки
        </NavLink>
        <NavLink to={routes.texts()} className={({ isActive }) => (isActive ? styles.active : undefined)}>
          <BookIcon className={styles.navIcon} />
          Тексты
        </NavLink>
      </nav>
      <div className={styles.tools}>
        <ThemeSwitcher />
      </div>
      <Meander className={styles.meander} />
    </header>
  );
}
