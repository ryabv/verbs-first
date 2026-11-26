import { Link, useNavigate } from 'react-router';
import { Arrow } from '@/shared/ui/ornament';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Крошки. На телефоне вместо цепочки — одна круглая стрелка «назад»: туда, откуда пришли (кот, другой урок, карта);
 * если пришли извне (открыли ссылку, обновили страницу) — к последнему разделу со ссылкой.
 * `className` — на обёртку: страница может, например, положить стрелку поверх картинки.
 * `back={false}` — раздел из нижнего меню: на телефоне крошек нет совсем, вернуться — через меню.
 */
export function Breadcrumbs({ items, className, back: withBack = true }: { items: Crumb[]; className?: string; back?: boolean }) {
  const back = withBack ? items.findLast((item) => item.to) : undefined;
  const navigate = useNavigate();
  // react-router хранит номер записи истории: idx > 0 — до этой страницы была страница приложения.
  const goBack = (e: React.MouseEvent) => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) === 0) return;
    e.preventDefault();
    void navigate(-1);
  };
  const classes = [styles.nav, !back && styles.noBack, className].filter(Boolean).join(' ');
  return (
    <nav className={classes} aria-label="Навигация">
      <ol className={styles.breadcrumbs}>
        {items.map((item, i) => (
          <li key={i} className={styles.item}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
          </li>
        ))}
      </ol>
      {back?.to && (
        <Link to={back.to} onClick={goBack} className={styles.back} aria-label="Назад" title="Назад">
          <Arrow direction="left" />
        </Link>
      )}
    </nav>
  );
}
