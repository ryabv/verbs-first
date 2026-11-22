import { useState } from 'react';
import { Link, NavLink, useMatch } from 'react-router';
import { ThemeSwitcher } from '@/features/theme-switcher';
import { routes } from '@/shared/config/routes';
import { CalendarIcon, CardsIcon, ColumnIcon, LighthouseIcon, ProfileIcon } from '@/shared/ui/icon';
import { Laurel, Meander } from '@/shared/ui/ornament';
import { ProfileSheet } from './ProfileSheet';
import styles from './AppHeader.module.css';

/**
 * Шапка. На компьютере — знак, разделы с подписями, тема. На телефоне — нижняя панель из значков:
 * подпись только у активного раздела (он плавно раздвигается в «пилюлю»), «Профиль» открывает шторку с темой.
 */
export function AppHeader() {
  // «История» — и карта на главной, и главы (/story/…).
  const inStory = useMatch('/story/*');
  const [profile, setProfile] = useState(false);
  // Пока открыта шторка профиля — выделен «Профиль», а не раздел страницы.
  const active = ({ isActive }: { isActive: boolean }) => (isActive && !profile ? styles.active : undefined);
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
        <NavLink to={routes.home()} end className={({ isActive }) => active({ isActive: isActive || !!inStory })}>
          <LighthouseIcon className={styles.navIcon} />
          <span className={styles.label}>История</span>
        </NavLink>
        <NavLink to={routes.today()} className={active}>
          <CalendarIcon className={styles.navIcon} />
          <span className={styles.label}>Ежедневные</span>
        </NavLink>
        <NavLink to={routes.cards()} className={active}>
          <CardsIcon className={styles.navIcon} />
          <span className={styles.label}>Карточки</span>
        </NavLink>
        <NavLink to={routes.grammar()} className={active}>
          <ColumnIcon className={styles.navIcon} />
          <span className={styles.label}>Справочник</span>
        </NavLink>
        <button
          type="button"
          className={profile ? `${styles.profile} ${styles.active}` : styles.profile}
          onClick={() => setProfile((v) => !v)}
          aria-expanded={profile}
          aria-label="Профиль"
        >
          <ProfileIcon className={styles.navIcon} />
          <span className={styles.label}>Профиль</span>
        </button>
      </nav>
      <div className={styles.tools}>
        <ThemeSwitcher />
      </div>
      <Meander className={styles.meander} />
      {profile && <ProfileSheet onClose={() => setProfile(false)} />}
    </header>
  );
}
