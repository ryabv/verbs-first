import { COAST, HOUSES, ISLETS, MOUNTAINS, OLIVES } from '../lib/island';
import styles from './StoryMap.module.css';

/**
 * Рисунок острова: море с волнами, суша, горы, оливы, домики, роза ветров.
 * Только декор — места глав и тропа рисуются поверх (StoryMap). Цвета — переменные темы.
 */
export function IslandArt() {
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id="story-waves" width="60" height="28" patternUnits="userSpaceOnUse">
          <path d="M4 16 q8 -8 16 0 t16 0" className={styles.wave} />
        </pattern>
        <clipPath id="story-coast">
          <path d={COAST} />
        </clipPath>
      </defs>

      <rect width="1000" height="640" className={styles.sea} />
      <rect width="1000" height="640" fill="url(#story-waves)" />

      {/* Мель вокруг берега, потом сама суша. */}
      <path d={COAST} className={styles.shallows} />
      <path d={COAST} className={styles.land} />

      {/* Холмистая середина острова — мягкое пятно внутри берега. */}
      <g clipPath="url(#story-coast)">
        <ellipse cx="540" cy="240" rx="230" ry="120" className={styles.highland} />
      </g>

      {MOUNTAINS.map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
          <path d="M-34 18 L0 -26 L34 18 Z" className={styles.mountain} />
          <path d="M-10 -13 L0 -26 L10 -13 L4 -10 L0 -15 L-5 -9 Z" className={styles.snow} />
        </g>
      ))}

      {OLIVES.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <line x1="0" y1="2" x2="0" y2="10" className={styles.trunk} />
          <circle r="8" className={styles.olive} />
        </g>
      ))}

      {HOUSES.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-6" y="-5" width="12" height="10" className={styles.house} />
          <path d="M-7 -5 Q0 -12 7 -5" className={styles.dome} />
        </g>
      ))}

      {/* Маленькие соседние островки. */}
      {ISLETS.map((d) => (
        <path key={d} d={d} className={styles.land} />
      ))}

      <text x="560" y="300" className={styles.islandName}>
        Анемуса
      </text>

      {/* Роза ветров. */}
      <g transform="translate(92 96)" className={styles.compass}>
        <circle r="30" />
        <path d="M0 -40 L7 -7 L0 0 L-7 -7 Z" className={styles.compassNorth} />
        <path d="M0 40 L7 7 L0 0 L-7 7 Z" />
        <path d="M-40 0 L-7 -7 L0 0 L-7 7 Z" />
        <path d="M40 0 L7 -7 L0 0 L7 7 Z" />
        <text y="-48" className={styles.compassLabel}>
          С
        </text>
      </g>
    </g>
  );
}
