import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ThemeSwitcher } from '@/features/theme-switcher';
import { routes } from '@/shared/config/routes';
import { lastStudySection, rememberStudySection, STUDY_SECTIONS, studySectionOf } from '@/shared/config/study';
import { HomeIcon, ProfileIcon, STUDY_ICONS, StudyIcon } from '@/shared/ui/icon';
import { Laurel, Meander } from '@/shared/ui/ornament';
import { StudyFan } from './StudyFan';
import styles from './AppHeader.module.css';

const cls = (on: boolean) => (on ? styles.active : undefined);
/** Сколько втягивается веер при закрытии (как в StudyFan.module.css). */
const FAN_CLOSE = 320;

/**
 * Шапка: Главная · Учёба · Профиль (docs/product/home.md). На компьютере — знак, разделы с подписями, тема.
 * На телефоне — нижняя панель: три пункта, значок с подписью под ним; активный — цветом раздела.
 * «Учёба» на компьютере открывает зону, где ученик был последним, а по наведению — меню из четырёх зон;
 * на телефоне — раскрывает веер разделов (StudyFan).
 */
export function AppHeader() {
  const { pathname } = useLocation();
  const section = studySectionOf(pathname);
  const inStudy = section !== undefined;
  // Запоминаем зону, где ученик был последним: «Учёба» откроет её.
  useEffect(() => {
    if (section) rememberStudySection(section.id);
  }, [section]);
  // Веер: открыт → закрывается (втягивается, FAN_CLOSE мс) → закрыт.
  const [fan, setFan] = useState<'closed' | 'open' | 'closing'>('closed');
  const fanOpen = fan === 'open';
  const closeFan = useCallback(() => {
    setFan((f) => (f === 'open' ? 'closing' : f));
    setTimeout(() => setFan((f) => (f === 'closing' ? 'closed' : f)), FAN_CLOSE);
  }, []);
  // На телефоне «Учёба» раскрывает веер разделов, на компьютере — ведёт в последнюю зону.
  const onStudy = (e: MouseEvent) => {
    if (!matchMedia('(max-width: 720px)').matches) return;
    e.preventDefault();
    if (fanOpen) closeFan();
    else setFan('open');
  };
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
        <NavLink to={routes.home()} end className={({ isActive }) => cls(isActive && !fanOpen)} onClick={closeFan}>
          <HomeIcon className={styles.navIcon} />
          <span className={styles.label}>Главная</span>
        </NavLink>
        <div className={styles.study}>
          <Link
            to={lastStudySection().to}
            className={[cls(inStudy || fanOpen), fanOpen && styles.fanOpen].filter(Boolean).join(' ')}
            aria-current={inStudy ? 'page' : undefined}
            aria-expanded={fanOpen}
            onClick={onStudy}
          >
            <span className={styles.studyIcon}>
              <StudyIcon className={styles.navIcon} />
              <span className={styles.studyClose} aria-hidden="true" />
            </span>
            <span className={styles.label}>Учёба</span>
          </Link>
          {/* Компьютер: зоны «Учёбы» — по наведению (и с клавиатуры — по фокусу). */}
          <div className={styles.menu}>
            <ul className={styles.menuList}>
              {STUDY_SECTIONS.map((z) => {
                const Icon = STUDY_ICONS[z.id];
                return (
                  <li key={z.id}>
                    <Link
                      to={z.to}
                      className={z.id === section?.id ? `${styles.menuItem} ${styles.menuOn}` : styles.menuItem}
                      // Снять фокус, иначе меню остаётся открытым (:focus-within) после перехода.
                      onClick={(e) => e.currentTarget.blur()}
                    >
                      <Icon className={styles.menuIcon} />
                      {z.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <NavLink to={routes.profile()} className={({ isActive }) => cls(isActive && !fanOpen)} onClick={closeFan}>
          <ProfileIcon className={styles.navIcon} />
          <span className={styles.label}>Профиль</span>
        </NavLink>
      </nav>
      <div className={styles.tools}>
        <ThemeSwitcher />
      </div>
      <Meander className={styles.meander} />
      {fan !== 'closed' && <StudyFan current={section?.id} closing={fan === 'closing'} onClose={closeFan} />}
    </header>
  );
}
