import { Link, NavLink, useMatch } from 'react-router';
import { ThemeSwitcher } from '@/features/theme-switcher';
import { routes } from '@/shared/config/routes';
import { CardsIcon, ColumnIcon, LighthouseIcon } from '@/shared/ui/icon';
import { Laurel, Meander } from '@/shared/ui/ornament';
import styles from './AppHeader.module.css';

export function AppHeader() {
  // «История» — и карта на главной, и главы (/story/…).
  const inStory = useMatch('/story/*');
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
        <NavLink to={routes.home()} end className={({ isActive }) => (isActive || inStory ? styles.active : undefined)}>
          <LighthouseIcon className={styles.navIcon} />
          История
        </NavLink>
        <NavLink to={routes.cards()} className={({ isActive }) => (isActive ? styles.active : undefined)}>
          <CardsIcon className={styles.navIcon} />
          Карточки
        </NavLink>
        <NavLink to={routes.grammar()} className={({ isActive }) => (isActive ? styles.active : undefined)}>
          <ColumnIcon className={styles.navIcon} />
          Справочник
        </NavLink>
      </nav>
      <div className={styles.tools}>
        <ThemeSwitcher />
      </div>
      <Meander className={styles.meander} />
    </header>
  );
}
