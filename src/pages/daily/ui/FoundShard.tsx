import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { STORY_PRAISE } from '@/entities/story';
import { ShardReveal, vesselOfMonth } from '@/entities/vessel';
import { monthSummary, monthTitle, shardOfDay, useDailyDays } from '@/features/daily';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import styles from './FoundShard.module.css';

const shards = (n: number) => `${n} ${plural(n, ['черепок', 'черепка', 'черепков'])}`;

/**
 * Праздник после закрытого дня: на весь экран — найденный черепок сосуда месяца прилетает в сиянии,
 * лучи, золотая пыль, «Μπράβο!» (без озвучки); ниже — сколько найдено. Одна кнопка («Забрать» — общая для наград, в конце месяца «Собрать сосуд») — на стол
 * реставратора (страница ежедневных этого месяца); последний черепок — там же «Собрать сосуд».
 */
export function FoundShard({ date }: { date: string }) {
  const month = date.slice(0, 7);
  const all = useDailyDays();
  const { closed, total, complete } = monthSummary(month, all);
  // У каждого дня свой черепок.
  const index = shardOfDay(date);
  const vessel = vesselOfMonth(month);
  const left = total - closed;
  const navigate = useNavigate();
  const table = routes.today(month);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void navigate(table);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, table]);

  return (
    <dialog open className={styles.overlay} aria-modal="true" aria-labelledby="found-title">
      <div className={styles.rays} aria-hidden="true" />
      <ShardReveal vessel={vessel} index={index} total={total} className={styles.scene} />
      <div className={styles.text}>
        <p className={styles.kicker}>Музей · {monthTitle(month)}</p>
        <p className={styles.praise} lang="el">
          {STORY_PRAISE.greek}
        </p>
        <h2 id="found-title" className={styles.title}>
          {complete ? 'Все черепки найдены!' : 'Найден черепок!'}
        </h2>
        <p className={styles.countText}>
          Найдено {closed} из {shards(total)}
        </p>
        <p className={styles.sub}>
          {complete ? 'Сосуд месяца можно собрать — он встанет в музей.' : `Похоже, это ${vessel.teaser}. Ещё ${shards(left)} — и сосуд можно будет собрать.`}
        </p>
        {/* Одна кнопка — на стол реставратора; последний черепок — там же «Собрать сосуд». */}
        <Link to={table} className={styles.cta} autoFocus>
          {complete ? 'Собрать сосуд' : 'Забрать'}
        </Link>
      </div>
    </dialog>
  );
}
