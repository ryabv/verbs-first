import { COAST_POINTS, geo, SETTLEMENTS } from './cyprus';

/**
 * Карта Кипра: размер, шум и генератор случайных чисел (для 3D-рельефа, terrain.ts), а также берег и декор
 * плоской запасной карты (IslandArt). География — cyprus.ts. Система координат карты — 2000×1280.
 */

export { MAP_H, MAP_W } from './cyprus';

/** Береговая линия для SVG — та же, что у 3D-рельефа. */
export const COAST = `M${COAST_POINTS.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;

/** Вершины гор плоской карты: x, y, масштаб — Троодос и Пентадактилос. */
export const MOUNTAINS: readonly [number, number, number][] = [
  [...geo(32.75, 34.97), 1.5],
  [...geo(32.87, 34.93), 2],
  [...geo(33.0, 34.94), 1.6],
  [...geo(33.12, 34.92), 1.2],
  [...geo(33.15, 35.3), 1],
  [...geo(33.4, 35.29), 1.1],
  [...geo(33.7, 35.32), 0.9],
];

/** Оливы — у Куклии и Пафоса, в Месаории. */
export const OLIVES: readonly [number, number][] = [
  geo(32.6, 34.72), geo(32.62, 34.74), geo(32.52, 34.74), geo(32.48, 34.82),
  geo(33.55, 35.1), geo(33.6, 35.12), geo(33.2, 35.15), geo(33.25, 35.1),
];

/** Домики — по одному-два на город. */
export const HOUSES: readonly [number, number][] = SETTLEMENTS.slice(0, 11).flatMap((t, i) =>
  i < 5 ? ([[t.x - 10, t.y], [t.x + 12, t.y + 6]] as [number, number][]) : ([[t.x, t.y]] as [number, number][]),
);

/** Детерминированный генератор случайных чисел: рисунок одинаковый при каждом открытии. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (ix: number, iy: number) => {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const fade = (t: number) => t * t * (3 - 2 * t);

/** Гладкий шум 0…1. */
export function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Шум из нескольких октав 0…1. */
export function fbm(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq + i * 17.3, y * freq - i * 9.1);
    norm += amp;
    amp /= 2;
    freq *= 2;
  }
  return sum / norm;
}
