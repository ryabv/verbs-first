/**
 * Рельеф 3D-карты Кипра — настоящий (SRTM, heightmap.ts), высоты приподняты в VERTICAL раз, чтобы горы читались
 * на карте целого острова. Сверху — мелкая фактура от шума, солёные озёра, города и деревни с полями.
 * Всё считается один раз на сетке и дальше берётся билинейной выборкой. Координаты карты: x вправо, y вниз.
 */
import { ISLETS, LAKES, LOWLANDS, MAP_H, MAP_W, SETTLEMENTS } from './cyprus';
import { elevationAt } from './heightmap';
import { fbm, noise } from './island';

export { ROADS, SETTLEMENTS } from './cyprus';

/** Единиц высоты на метр. По горизонтали единица ≈ 114 м, так что горы приподняты примерно в 8,5 раза. */
const VERTICAL = 0.075;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Высота над морем в метрах: настоящий рельеф, берег чуть изрезан шумом, озёра — без выхода к морю. */
function elevation(x: number, y: number): number {
  // Лёгкое искажение — берег живее, чем по клеткам сетки высот (2,5 единицы).
  const wx = x + (fbm(x / 7, y / 7, 2) - 0.5) * 2.5;
  const wy = y + (fbm(x / 7 + 9, y / 7 - 4, 2) - 0.5) * 2.5;
  let e = elevationAt(wx, wy);
  for (const [cx, cy, rx, ry] of LOWLANDS) {
    const k = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
    // Плавно: в середине 2 м, к краю — без влияния (без скачка высоты — без лесенки).
    if (k < 1.3) e = Math.max(e, 2 - Math.max(0, k - 1) * 100);
  }
  for (const [cx, cy, rx, ry] of LAKES) {
    const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    // Внутри — вода, вокруг — узкое кольцо суши (озеро не соединяется с морем), дальше — настоящие высоты.
    // Всё без скачков: скачок высоты дал бы берег лесенкой по клеткам сетки.
    // Кольцо — ~8 единиц (≈900 м, как пляж Ледис-Майл) от края озера, в любую сторону.
    const out = (Math.sqrt(k) - 1) * Math.min(rx, ry);
    if (k < 1) e = Math.min(e, -6 + k * 8);
    else if (out < 12) e = Math.max(e, out < 8 ? 2 + out * 0.2 : 3.6 - (out - 8) * 8);
  }
  for (const [cx, cy, r, top] of ISLETS) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d < 1.4) e = Math.max(e, top * (1 - d * d) + (fbm(x / 3, y / 3, 2) - 0.5) * 6);
  }
  return e;
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
  const e = elevation(x, y);
  // Высота непрерывна через уровень моря (h ∝ e у берега): вода режет склон между вершинами сетки,
  // и берег идёт плавной линией, а не лесенкой по клеткам. Глубже — shapeSeabed.
  if (e <= 0) return { h: e * 0.15, town: 0, field: 0, forest: 0 };
  // Первые метры над морем — пологий подъём (пляж), дальше — настоящий рельеф.
  let h = e * VERTICAL + 1.5 * smooth(0, 20, e);
  // Фактура склонов: сетка высот ~570 м, мельче — шум; в горах — каменистые гребешки.
  // Посёлки стоят на ровной земле — фактуры там нет.
  const town = townMask(x, y);
  const mountain = smooth(12, 60, h);
  // У самой воды фактуры нет — она рвала бы линию берега.
  const inland = smooth(2, 25, e) * (1 - town);
  h += ((fbm(x / 14, y / 14, 3) - 0.5) * (1.5 + 5 * mountain) + (ridged(x / 16, y / 16) - 0.45) * 5 * mountain) * inland;

  let fieldNear = 0;
  for (const st of SETTLEMENTS) {
    if (!st.fields) continue;
    const d = Math.hypot(x - st.x, y - st.y);
    fieldNear = Math.max(fieldNear, 1 - smooth(st.fields * 0.4, st.fields * 0.75, d));
  }
  const field = clamp01(fieldNear * smooth(30, 16, h) * smooth(0.6, 2, h) * (1 - town * 1.4) * smooth(0.42, 0.5, fbm(x / 50 + 3, y / 50, 3)));
  // Лес — в горах (Троодос, Пафосский лес, склоны Пентадактилоса); низины Кипра сухие — там кустарник и поля.
  const forest = clamp01(smooth(0.45, 0.58, fbm(x / 70 + 40, y / 70, 4)) * smooth(20, 38, h) * smooth(175, 145, h) * (1 - field) * (1 - town));
  return { h, town, field, forest };
}

/** Шаг сетки рельефа: 2.5 единицы — 801×513 вершин на карту 2000×1280. */
export const GRID_STEP = 2.5;
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
      // Глубже из двух: у берега — непрерывное продолжение склона (sample), дальше — по расстоянию до берега.
      let h = Math.min(heights[k]!, -(36 * smooth(0, 140, d) + (fbm(x / 30, y / 30, 3) - 0.5) * 4 * smooth(0, 20, d)));
      const edge = Math.min(x, MAP_W - x, y, MAP_H - y);
      h = h + (-36 - h) * (1 - smooth(0, 90, edge));
      heights[k] = Math.min(-0.05, h);
    }
  }
}

/**
 * Убрать обрывки суши из данных высот (отмели, ошибки съёмки у берега): остаются Кипр и островки из ISLETS.
 */
function dropSpecks(heights: Float32Array) {
  const seen = new Uint8Array(GW * GH);
  const keep = ISLETS.map(([x, y]) => Math.round(y / GRID_STEP) * GW + Math.round(x / GRID_STEP));
  const stack: number[] = [];
  for (let k = 0; k < heights.length; k++) {
    if (seen[k] || heights[k]! <= 0) continue;
    const cells: number[] = [];
    seen[k] = 1;
    stack.push(k);
    while (stack.length) {
      const c = stack.pop()!;
      cells.push(c);
      const i = c % GW;
      for (const n of [i > 0 ? c - 1 : -1, i < GW - 1 ? c + 1 : -1, c - GW, c + GW]) {
        if (n >= 0 && n < heights.length && !seen[n] && heights[n]! > 0) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (cells.length < 2000 && !keep.some((c) => cells.includes(c))) for (const c of cells) heights[c] = -0.5;
  }
}

/**
 * Замкнутые клочки воды (низины у берега, которые сетка высот путает с морем) → суша.
 * Остаются море (вода, связанная с краем карты) и озёра из LAKES.
 */
function fillPuddles(heights: Float32Array) {
  const seen = new Uint8Array(GW * GH);
  const lakes = LAKES.map(([x, y]) => Math.round(y / GRID_STEP) * GW + Math.round(x / GRID_STEP));
  const stack: number[] = [];
  for (let k = 0; k < heights.length; k++) {
    if (seen[k] || heights[k]! > 0) continue;
    const cells: number[] = [];
    let open = false;
    seen[k] = 1;
    stack.push(k);
    while (stack.length) {
      const c = stack.pop()!;
      cells.push(c);
      const i = c % GW;
      const j = (c - i) / GW;
      if (i === 0 || j === 0 || i === GW - 1 || j === GH - 1) open = true;
      for (const n of [i > 0 ? c - 1 : -1, i < GW - 1 ? c + 1 : -1, c - GW, c + GW]) {
        if (n >= 0 && n < heights.length && !seen[n] && heights[n]! <= 0) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (!open && !lakes.some((c) => cells.includes(c))) for (const c of cells) heights[c] = 0.3;
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
  dropSpecks(heights);
  fillPuddles(heights);
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
