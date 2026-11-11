/**
 * Вымышленный остров Ανεμούσα: размер карты, шум и генератор случайных чисел (для 3D-рельефа, terrain.ts),
 * а также берег и декор плоской запасной карты (IslandArt). Система координат карты — 1000×640.
 */

export const MAP_W = 1000;
export const MAP_H = 640;

/** Береговая линия: абсолютные кубические кривые (M, C…, Z). */
export const COAST =
  'M150 330 C138 252 214 176 318 152 C398 128 468 92 560 110 C640 124 700 98 772 140 C842 178 902 232 884 300 ' +
  'C872 350 822 362 802 402 C782 452 762 520 682 546 C622 566 562 544 502 562 C440 586 380 562 330 542 ' +
  'C262 516 192 522 162 462 C132 410 156 382 150 330 Z';

/** Два маленьких соседних островка. */
export const ISLETS = [
  'M906 512 c18 -12 46 -8 52 6 c4 12 -20 20 -38 16 c-14 -3 -22 -12 -14 -22 z',
  'M70 548 c14 -10 36 -6 40 4 c2 10 -16 16 -30 12 c-12 -3 -16 -10 -10 -16 z',
];
/** Вершины гор: x, y, масштаб. */
export const MOUNTAINS: readonly [number, number, number][] = [
  [468, 232, 1],
  [520, 212, 1.3],
  [574, 228, 1.05],
  [626, 250, 0.8],
];

export const OLIVES: readonly [number, number][] = [
  [180, 360], [200, 340], [224, 356], [196, 404], [222, 420], [244, 392], [262, 430],
  [700, 300], [724, 318], [748, 298],
];

export const HOUSES: readonly [number, number][] = [
  [598, 432], [612, 440], [630, 430], [644, 444], [604, 462], [626, 470], [652, 462],
  [334, 404], [350, 396], [362, 412], [440, 516], [470, 512],
];

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
