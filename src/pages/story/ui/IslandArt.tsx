import { geo } from '../lib/cyprus';
import { COAST, HOUSES, MAP_H, MAP_W, MOUNTAINS, OLIVES } from '../lib/island';
import styles from './StoryMap.module.css';

/**
 * Рисунок Кипра (запасная плоская карта): море с волнами, суша, горы, оливы, домики, роза ветров.
 * Карта 2000×1280 — значки рисуются в масштабе ×2.
 * Только декор — места глав и тропа рисуются поверх (StoryMap). Цвета — переменные темы.
 */
export function IslandArt() {
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id="story-waves" width="120" height="56" patternUnits="userSpaceOnUse">
          <path d="M8 32 q16 -16 32 0 t32 0" className={styles.wave} />
        </pattern>
        <clipPath id="story-coast">
          <path d={COAST} />
        </clipPath>
      </defs>

      <rect width={MAP_W} height={MAP_H} className={styles.sea} />
      <rect width={MAP_W} height={MAP_H} fill="url(#story-waves)" />

      {/* Мель вокруг берега, потом сама суша. */}
      <path d={COAST} className={styles.shallows} />
      <path d={COAST} className={styles.land} />

      {/* Троодос и Пентадактилос — мягкие пятна внутри берега. */}
      <g clipPath="url(#story-coast)">
        <ellipse cx={geo(32.88, 34.94)[0]} cy={geo(32.88, 34.94)[1]} rx="300" ry="110" className={styles.highland} />
        <ellipse cx={geo(33.45, 35.3)[0]} cy={geo(33.45, 35.3)[1]} rx="380" ry="34" className={styles.highland} />
      </g>

      {MOUNTAINS.map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k * 1.6})`}>
          <path d="M-34 18 L0 -26 L34 18 Z" className={styles.mountain} />
          <path d="M-10 -13 L0 -26 L10 -13 L4 -10 L0 -15 L-5 -9 Z" className={styles.snow} />
        </g>
      ))}

      {OLIVES.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(2)`}>
          <line x1="0" y1="2" x2="0" y2="10" className={styles.trunk} />
          <circle r="8" className={styles.olive} />
        </g>
      ))}

      {HOUSES.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(2)`}>
          <rect x="-6" y="-5" width="12" height="10" className={styles.house} />
          <path d="M-7 -5 Q0 -12 7 -5" className={styles.dome} />
        </g>
      ))}

      <text x={geo(33.55, 35.13)[0]} y={geo(33.55, 35.13)[1]} className={styles.islandName}>
        Кипр
      </text>

      {/* Роза ветров. */}
      <g transform="translate(184 200) scale(2)" className={styles.compass}>
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
