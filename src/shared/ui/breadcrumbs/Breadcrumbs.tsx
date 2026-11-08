import { Link } from 'react-router';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <ol className={styles.breadcrumbs}>
      {items.map((item, i) => (
        <li key={i} className={styles.item}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
        </li>
      ))}
    </ol>
  );
}
