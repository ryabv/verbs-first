import type { CSSProperties } from 'react';
import { portraitSpan } from '../lib/shapes';
import type { Vessel } from '../model/types';
import styles from './VesselPicture.module.css';

const MUSEUM = `${process.env.BASE_URL}museum/`;

/**
 * Сосуд картинкой (без 3D): `photo` — портрет спереди с росписью, `silhouette` — силуэт; `fill` — доля силуэта,
 * залитая снизу (найденные черепки). Картинки печёт `pnpm museum:bake`.
 */
export function VesselPicture({ vessel, kind, fill = 0, className }: { vessel: Vessel; kind: 'photo' | 'silhouette'; fill?: number; className?: string }) {
  if (kind === 'photo') return <img src={`${MUSEUM}${vessel.id}-photo.webp`} alt="" className={`${styles.picture} ${className ?? ''}`} loading="lazy" />;
  // Заливка — по высоте самого сосуда в кадре, а не всей картинки.
  const { bottom, top } = portraitSpan(vessel.shape);
  const level = bottom + (top - bottom) * Math.min(1, Math.max(0, fill));
  const style = { '--mask': `url("${MUSEUM}${vessel.id}-mask.png")`, '--fill': `${(level * 100).toFixed(1)}%` } as CSSProperties;
  return <span className={`${styles.picture} ${styles.silhouette} ${className ?? ''}`} style={style} aria-hidden="true" />;
}
