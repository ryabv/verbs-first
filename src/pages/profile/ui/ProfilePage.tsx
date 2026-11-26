import { Link } from 'react-router';
import { ThemeChoice } from '@/features/theme-switcher';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { useCollection } from '../model/collection';
import styles from './ProfilePage.module.css';

/** /profile — кнопка «Коллекции» (раздел — /profile/collection, docs/product/collection.md), под ней настройки: тема. */
export function ProfilePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>
      <CollectionEntry />
      <h2 className={styles.settings}>Настройки</h2>
      <section className={styles.block}>
        <h2 className={styles.label}>Тема</h2>
        <ThemeChoice />
      </section>
    </div>
  );
}

const KINDS = [
  { id: 'vessels', label: 'сосуды' },
  { id: 'finds', label: 'находки' },
  { id: 'medals', label: 'медальоны' },
] as const;

/** Кнопка раздела — карточка как на Главной: подпись, сколько всего, счётчики по видам, круглая кнопка. */
function CollectionEntry() {
  const c = useCollection();
  return (
    <Link to={routes.collection()} className={styles.entry}>
      <span className={styles.entryText}>
        <span className={styles.entryKicker}>Коллекция</span>
        <span className={styles.entryTitle}>
          {c.total === 0 ? 'Пока пусто' : `${c.total} ${plural(c.total, ['экспонат', 'экспоната', 'экспонатов'])}`}
        </span>
        <span className={styles.entryStats}>
          {KINDS.map((k) => (
            <span key={k.id} className={styles.stat}>
              <b>
                {c.counts[k.id].got}
                <small>/{c.counts[k.id].of}</small>
              </b>
              {k.label}
            </span>
          ))}
        </span>
      </span>
      <span className={styles.go} aria-hidden="true">
        <span className={styles.goDisc}>
          {/* Шеврон рисунком: символ «›» в шрифте сидит не по центру круга. */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 5.5 16 12l-6.5 6.5" />
          </svg>
        </span>
        <span className={styles.goLabel}>открыть</span>
      </span>
    </Link>
  );
}
