/**
 * Рельеф 3D-карты острова Ανεμούσα (вымышленный): изрезанный берег с заливами и лагуной,
 * хребты, долины с полями, посёлки, леса. Всё считается один раз на сетке и дальше
 * берётся билинейной выборкой. Координаты — как у карты: x вправо, y вниз, 1000×640.
 */
import { fbm, MAP_H, MAP_W, noise } from './island';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Расстояние от точки до отрезка. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

/** Пятна суши (+) и воды (−): центр, полуоси, вес. */
const BLOBS: readonly [number, number, number, number, number][] = [
  [500, 330, 230, 115, 1],
  [262, 400, 100, 85, 0.95],
  [245, 300, 75, 45, 0.85],
  [620, 190, 115, 55, 0.95],
  [760, 258, 95, 34, 0.9],
  [852, 292, 40, 25, 0.85],
  [806, 206, 34, 24, 0.75],
  [680, 470, 95, 60, 0.95],
  [455, 480, 105, 55, 0.95],
  [520, 525, 150, 42, 0.9],
  [300, 470, 95, 50, 0.85],
  [215, 515, 48, 40, 0.85],
  [395, 545, 40, 30, 0.7],
  // Заливы и бухты.
  [818, 402, 56, 52, -1.6],
  [300, 492, 58, 24, -2.2],
  [478, 586, 34, 22, -1],
  [736, 172, 44, 34, -1.3],
  [420, 148, 72, 40, -1.1],
  [150, 442, 36, 30, -1],
  [600, 585, 40, 22, -0.8],
  [880, 360, 40, 40, -0.8],
];

/** Коса, отделяющая лагуну от моря. */
const SANDBAR: [number, number, number, number] = [236, 522, 336, 527];

/** Хребты: отрезок, ширина, высота. */
const RANGES: readonly [number, number, number, number, number, number][] = [
  [400, 262, 600, 238, 34, 90],
  [640, 235, 790, 255, 30, 50],
  [225, 335, 330, 290, 34, 42],
  [700, 455, 760, 470, 26, 28],
  [560, 170, 690, 160, 26, 34],
];

/**
 * Посёлки: центр, радиус, домов. Первые — города, дальше — деревни и хутора.
 * Вокруг деревень — поля.
 */
export const SETTLEMENTS: readonly { x: number; y: number; r: number; n: number; fields: number }[] = [
  { x: 622, y: 455, r: 34, n: 230, fields: 110 },
  { x: 462, y: 520, r: 24, n: 120, fields: 70 },
  { x: 345, y: 418, r: 20, n: 70, fields: 90 },
  { x: 690, y: 497, r: 14, n: 40, fields: 60 },
  { x: 585, y: 522, r: 12, n: 30, fields: 0 },
  { x: 655, y: 178, r: 16, n: 45, fields: 70 },
  { x: 280, y: 322, r: 6, n: 8, fields: 30 },
  { x: 800, y: 222, r: 8, n: 14, fields: 40 },
  { x: 212, y: 392, r: 9, n: 14, fields: 70 },
  { x: 520, y: 372, r: 9, n: 18, fields: 50 },
  { x: 694, y: 388, r: 8, n: 16, fields: 0 },
];

/** Дороги между посёлками и местами. */
export const ROADS: readonly [number, number][][] = [
  [[455, 538], [462, 520], [540, 515], [585, 522], [622, 455]],
  [[622, 455], [660, 480], [690, 497]],
  [[462, 520], [420, 480], [345, 418]],
  [[345, 418], [300, 360], [280, 322]],
  [[345, 418], [270, 405], [212, 392]],
  [[212, 392], [218, 460], [240, 516], [290, 524]],
  [[622, 455], [570, 410], [520, 372]],
  [[520, 372], [470, 320], [420, 262]],
  [[520, 372], [590, 300], [620, 220], [655, 178]],
  [[622, 455], [660, 420], [692, 395]],
  [[692, 395], [720, 330], [790, 290], [864, 292]],
  [[790, 290], [800, 222]],
  [[500, 470], [462, 520]],
];

/** «Сколько здесь суши»: > 0.5 — суша. */
function landness(x: number, y: number): number {
  // Искажение координат — берег становится изрезанным.
  const wx = x + (fbm(x / 140, y / 140, 3) - 0.5) * 44;
  const wy = y + (fbm(x / 140 + 9, y / 140 - 4, 3) - 0.5) * 44;
  let f = 0;
  for (const [cx, cy, rx, ry, w] of BLOBS) f += w * Math.exp(-(((wx - cx) / rx) ** 2 + ((wy - cy) / ry) ** 2) * 1.1);
  f += (fbm(x / 38, y / 38, 3) - 0.5) * 0.24;
  const bar = segDist(x, y, ...SANDBAR);
  f = Math.max(f, 0.53 - bar * 0.025 + (noise(x / 9, y / 9) - 0.5) * 0.03);
  return f;
}

function ridged(x: number, y: number): number {
  let sum = 0;
  let amp = 0.6;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    const r = 1 - Math.abs(noise(x * f + i * 31.7, y * f - i * 12.3) * 2 - 1);
    sum += r * r * amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum;
}

export function townMask(x: number, y: number): number {
  let m = 0;
  for (const s of SETTLEMENTS) m = Math.max(m, Math.exp(-(((x - s.x) ** 2 + (y - s.y) ** 2) / (s.r * s.r)) * 1.2));
  return m;
}

/** Высота и маски в точке. */
function sample(x: number, y: number) {
  const f = landness(x, y);
  if (f < 0.5) return { h: Math.max(-36, (f - 0.5) * 38 - 0.3), town: 0, field: 0, forest: 0 };
  const s = smooth(0.5, 0.85, f);
  let h = 0.4 + s * 14 + (fbm(x / 60, y / 60, 4) - 0.5) * 22 * s;
  for (const [ax, ay, bx, by, w, amp] of RANGES) {
    const d = segDist(x, y, ax, ay, bx, by);
    const m = Math.exp(-(d * d) / (2 * w * w));
    if (m > 0.01) h += m * (0.45 + ridged(x / 42, y / 42)) * amp * s;
  }
  h += (fbm(x / 12, y / 12, 2) - 0.5) * 3 * s;
  const town = townMask(x, y);
  // Посёлки стоят на выровненной земле.
  h = h + (Math.min(h, 10) - h) * town * 0.8;

  let fieldNear = 0;
  for (const st of SETTLEMENTS) {
    if (!st.fields) continue;
    const d = Math.hypot(x - st.x, y - st.y);
    fieldNear = Math.max(fieldNear, 1 - smooth(st.fields * 0.4, st.fields * 0.75, d));
  }
  const field = clamp01(fieldNear * smooth(30, 16, h) * smooth(0.52, 0.6, f) * (1 - town * 1.4) * smooth(0.42, 0.5, fbm(x / 50 + 3, y / 50, 3)));
  const forest = clamp01(smooth(0.5, 0.62, fbm(x / 70 + 40, y / 70, 4)) * smooth(6, 14, h) * smooth(95, 70, h) * (1 - field) * (1 - town));
  return { h, town, field, forest };
}

export const GRID_STEP = 2;
const GW = MAP_W / GRID_STEP + 1;
const GH = MAP_H / GRID_STEP + 1;

export interface Terrain {
  cols: number;
  rows: number;
  heights: Float32Array;
  town: Float32Array;
  field: Float32Array;
  forest: Float32Array;
  heightAt(x: number, y: number): number;
  maskAt(x: number, y: number): { town: number; field: number; forest: number };
}

/**
 * Дно: глубина растёт с расстоянием от берега (карта расстояний на сетке, два прохода),
 * к краям плитки — до самого глубокого, чтобы край карты сливался с морем вокруг.
 */
function shapeSeabed(heights: Float32Array) {
  const dist = new Float32Array(GW * GH);
  for (let k = 0; k < dist.length; k++) dist[k] = heights[k]! >= 0 ? 0 : 1e6;
  const relax = (k: number, n: number, w: number) => {
    if (dist[n]! + w < dist[k]!) dist[k] = dist[n]! + w;
  };
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      if (i > 0) relax(k, k - 1, 1);
      if (j > 0) relax(k, k - GW, 1);
      if (i > 0 && j > 0) relax(k, k - GW - 1, Math.SQRT2);
      if (i < GW - 1 && j > 0) relax(k, k - GW + 1, Math.SQRT2);
    }
  }
  for (let j = GH - 1; j >= 0; j--) {
    for (let i = GW - 1; i >= 0; i--) {
      const k = j * GW + i;
      if (i < GW - 1) relax(k, k + 1, 1);
      if (j < GH - 1) relax(k, k + GW, 1);
      if (i < GW - 1 && j < GH - 1) relax(k, k + GW + 1, Math.SQRT2);
      if (i > 0 && j < GH - 1) relax(k, k + GW - 1, Math.SQRT2);
    }
  }
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      if (heights[k]! >= 0) continue;
      const x = i * GRID_STEP;
      const y = j * GRID_STEP;
      const d = dist[k]! * GRID_STEP;
      let h = -(0.3 + 36 * smooth(0, 140, d) + (fbm(x / 30, y / 30, 3) - 0.5) * 4 * smooth(0, 20, d));
      const edge = Math.min(x, MAP_W - x, y, MAP_H - y);
      h = h + (-36 - h) * (1 - smooth(0, 90, edge));
      heights[k] = Math.min(-0.2, h);
    }
  }
}

let cached: Terrain | undefined;

export function getTerrain(): Terrain {
  if (cached) return cached;
  const heights = new Float32Array(GW * GH);
  const town = new Float32Array(GW * GH);
  const field = new Float32Array(GW * GH);
  const forest = new Float32Array(GW * GH);
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const s = sample(i * GRID_STEP, j * GRID_STEP);
      const k = j * GW + i;
      heights[k] = s.h;
      town[k] = s.town;
      field[k] = s.field;
      forest[k] = s.forest;
    }
  }
  shapeSeabed(heights);
  const bilinear = (arr: Float32Array, x: number, y: number) => {
    const gx = Math.min(GW - 1.001, Math.max(0, x / GRID_STEP));
    const gy = Math.min(GH - 1.001, Math.max(0, y / GRID_STEP));
    const i = Math.floor(gx);
    const j = Math.floor(gy);
    const fx = gx - i;
    const fy = gy - j;
    const a = arr[j * GW + i]!;
    const b = arr[j * GW + i + 1]!;
    const c = arr[(j + 1) * GW + i]!;
    const d = arr[(j + 1) * GW + i + 1]!;
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  cached = {
    cols: GW - 1,
    rows: GH - 1,
    heights,
    town,
    field,
    forest,
    heightAt: (x, y) => bilinear(heights, x, y),
    maskAt: (x, y) => ({ town: bilinear(town, x, y), field: bilinear(field, x, y), forest: bilinear(forest, x, y) }),
  };
  return cached;
}
