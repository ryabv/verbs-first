import { Link } from 'react-router';
import { ChapterMedal, FindIcon } from '@/entities/story';
import { VesselPicture } from '@/entities/vessel';
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

/** Кнопка раздела: превью (сосуд текущего месяца, последняя находка, лучший медальон — картинками, без 3D) и счётчики. */
function CollectionEntry() {
  const c = useCollection();
  const vessel = c.vessels.find((v) => v.built) ?? c.vessels[0];
  const find = c.finds.findLast((f) => f.found);
  const medal = c.medals.filter((m) => m.rank > 0).reduce<(typeof c.medals)[number] | undefined>((best, m) => (!best || m.rank > best.rank ? m : best), undefined);
  return (
    <Link to={routes.collection()} className={styles.entry}>
      <span className={styles.entryPics} aria-hidden="true">
        {vessel && <VesselPicture vessel={vessel.vessel} kind={vessel.built ? 'photo' : 'silhouette'} fill={vessel.found / Math.max(1, vessel.total)} className={styles.entryVessel} />}
        {find ? <FindIcon icon={find.chapter.find!.icon} className={styles.entryFind} /> : null}
        <ChapterMedal chapter={medal?.chapter ?? 1} rank={medal?.rank ?? 0} size="2.6rem" />
      </span>
      <span className={styles.entryText}>
        <b>Коллекция</b>
        <span>
          {c.total === 0 ? 'Пока пусто — сосуды, находки и медальоны появятся здесь' : `${c.total} ${plural(c.total, ['экспонат', 'экспоната', 'экспонатов'])}`}
        </span>
        <span className={styles.entryCounts}>
          сосуды {c.counts.vessels.got}/{c.counts.vessels.of} · находки {c.counts.finds.got}/{c.counts.finds.of} · медальоны {c.counts.medals.got}/{c.counts.medals.of}
        </span>
      </span>
      <span className={styles.entryArrow} aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
