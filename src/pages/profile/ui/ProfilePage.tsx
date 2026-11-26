import { ThemeChoice } from '@/features/theme-switcher';
import { Collection } from './Collection';
import styles from './ProfilePage.module.css';

/** /profile — коллекция собранного (docs/product/collection.md), под ней настройки: тема. */
export function ProfilePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>
      <Collection />
      <h2 className={styles.settings}>Настройки</h2>
      <section className={styles.block}>
        <h2 className={styles.label}>Тема</h2>
        <ThemeChoice />
      </section>
    </div>
  );
}
