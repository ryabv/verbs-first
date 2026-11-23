import { ThemeChoice } from '@/features/theme-switcher';
import { LevelSwitch } from '@/widgets/practice-task';
import { Collection } from './Collection';
import styles from './ProfilePage.module.css';

/** /profile — коллекция собранного (docs/product/collection.md), под ней настройки: тема и уровень заданий. */
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
      <section className={styles.block}>
        <LevelSwitch />
        <p className={styles.note}>Один уровень на всё: главы, закрепление и ежедневные.</p>
      </section>
    </div>
  );
}
