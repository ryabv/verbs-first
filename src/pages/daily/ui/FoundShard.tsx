import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { STORY_PRAISE } from '@/entities/story';
import { ShardReveal, vesselOfMonth } from '@/entities/vessel';
import { monthSummary, monthTitle, shardOfDay, useDailyDays } from '@/features/daily';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { Arrow } from '@/shared/ui/ornament';
import styles from './FoundShard.module.css';

const shards = (n: number) => `${n} ${plural(n, ['черепок', 'черепка', 'черепков'])}`;

/**
 * Праздник после закрытого дня: на весь экран — найденный черепок сосуда месяца прилетает в сиянии,
 * лучи, золотая пыль, «Μπράβο!» (без озвучки); ниже — сколько найдено и что дальше.
 * Последний черепок месяца — «Все черепки найдены!» и «Собрать сосуд».
 */
export function FoundShard({ date, onClose }: { date: string; onClose: () => void }) {
  const month = date.slice(0, 7);
  const all = useDailyDays();
  const { closed, found, total, complete } = monthSummary(month, all);
  // У каждого дня свой черепок; в полоске — на месте своего дня.
  const index = shardOfDay(date);
  const vessel = vesselOfMonth(month);
  const left = total - closed;
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    actionsRef.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <dialog open className={styles.overlay} aria-modal="true" aria-labelledby="found-title">
      <div className={styles.rays} aria-hidden="true" />
      <ShardReveal vessel={vessel} index={index} total={total} className={styles.scene} />
      <p className={styles.hint}>Покрутите черепок</p>
      <div className={styles.text}>
        <p className={styles.kicker}>Музей · {monthTitle(month)}</p>
        <p className={styles.praise} lang="el">
          {STORY_PRAISE.greek}
        </p>
        <h2 id="found-title" className={styles.title}>
          {complete ? 'Все черепки найдены!' : 'Найден черепок!'}
        </h2>
        <div className={styles.count} aria-label={`Найдено ${closed} из ${total}`}>
          <span className={styles.pieces} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i === index ? `${styles.piece} ${styles.fresh}` : found.includes(i) ? styles.piece : styles.slot} />
            ))}
          </span>
          <span className={styles.countText}>
            {closed} из {total}
          </span>
        </div>
        <p className={styles.sub}>
          {complete ? 'Сосуд месяца можно собрать — он встанет в музей.' : `Похоже, это ${vessel.teaser}. Ещё ${shards(left)} — и сосуд можно будет собрать.`}
        </p>
        <div ref={actionsRef} className={styles.actions}>
          {complete ? (
            <Link to={routes.today(month)} className={styles.cta}>
              Собрать сосуд <Arrow />
            </Link>
          ) : (
            <button type="button" className={styles.cta} onClick={onClose}>
              Дальше <Arrow />
            </button>
          )}
          {complete ? (
            <button type="button" className={styles.link} onClick={onClose}>
              Позже
            </button>
          ) : (
            <Link to={routes.today(month)} className={styles.link}>
              На стол реставратора
            </Link>
          )}
        </div>
      </div>
    </dialog>
  );
}
