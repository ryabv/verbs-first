/**
 * Тяжёлая подготовка сосуда без DOM: роспись с состариванием и резка на черепки. Печётся заранее скриптом
 * `pnpm museum:bake` в `public/museum/` — страница только скачивает (WebP и сжатые черепки) и считает сама,
 * лишь если файла нет.
 */
import * as THREE from 'three';
import type { VesselShape } from '../model/types';
import { age } from './age';
import { STYLES, TEX_H, TEX_W } from './paint';
import { FIT_H, FIT_R, FLOOR, PORTRAIT_H, PORTRAIT_W, PX, SHAPES } from './shapes';

export { PORTRAIT_H, PORTRAIT_W } from './shapes';

type Shape = VesselShape;

/* ---------- Случайность с зерном: один сосуд всегда бьётся одинаково ---------- */
export function rng(seed: string) {
  let h = 1779033703;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/* ---------- Профиль и развёртка ---------- */
export interface Prepared {
  pts: THREE.Vector2[];
  /** Высота профиля → координата v текстуры (доля длины профиля), по внешней стороне. */
  vAt: (y: number) => number;
  scale: number;
}
const prepared = new Map<string, Prepared>();
export function prepare(shape: Shape): Prepared {
  const hit = prepared.get(shape);
  if (hit) return hit;
  const def = SHAPES[shape];
  const curve = new THREE.SplineCurve(def.profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = curve.getSpacedPoints(180);
  const top = pts.reduce((m, p, i) => (p.y > pts[m]!.y ? i : m), 0);
  const vAt = (y: number) => {
    for (let i = 1; i <= top; i++) if (pts[i]!.y >= y) return i / (pts.length - 1);
    return top / (pts.length - 1);
  };
  const maxY = Math.max(...pts.map((p) => p.y));
  const maxR = Math.max(...pts.map((p) => p.x), ...def.handles.flatMap((h) => h.pts.map((q) => q[0])));
  const out = { pts, vAt, scale: Math.min(FIT_H / maxY, FIT_R / maxR) };
  prepared.set(shape, out);
  return out;
}
export const TAU = Math.PI * 2;

/* ---------- Черепки: ячейки Вороного на поверхности сосуда ---------- */
interface Pieces {
  seeds: { u: number; v: number }[];
  /** Номер черепка для точки поверхности (в координатах профиля, до масштаба). */
  pieceAt: (x: number, y: number, z: number) => number;
}
function pieces(id: string, pts: readonly THREE.Vector2[], count: number): Pieces {
  const rnd = rng(`${id}:pieces`);
  // Точка поверхности по координатам развёртки — расстояния меряем в 3D: у узкого горла кусок не охватит круг.
  const at = (u: number, v: number) => {
    const p = pts[Math.min(pts.length - 1, Math.round(v * (pts.length - 1)))]!;
    const phi = Math.PI + u * TAU;
    return [p.x * Math.sin(phi), p.y, p.x * Math.cos(phi)] as const;
  };
  const seeds = Array.from({ length: count }, () => ({ u: rnd(), v: 0.03 + rnd() * 0.9 }));
  const seedPos = seeds.map((q) => at(q.u, q.v));
  // Линия скола не прямая: точку чуть «ведёт» плавным шумом — край черепка неровный, но гладкий.
  const nearest = (px: number, py: number, pz: number) => {
    const x = px + 0.035 * Math.sin(py * 9 + pz * 5) + 0.012 * Math.sin(pz * 23 + py * 17);
    const y = py + 0.03 * Math.sin(px * 8 + pz * 7) + 0.01 * Math.sin(px * 21 - pz * 19);
    const z = pz + 0.035 * Math.sin(px * 6 - py * 9) + 0.012 * Math.sin(py * 25 + px * 13);
    let a = Infinity;
    let ia = 0;
    seedPos.forEach(([sx, sy, sz], i) => {
      const d = Math.hypot(x - sx, y - sy, z - sz);
      if (d < a) {
        a = d;
        ia = i;
      }
    });
    return ia;
  };
  return { seeds, pieceAt: nearest };
}

/** Черепок как данные: лицо — индексированная сетка (вершины уже сдвинуты к центру черепка), край скола — рёбра. */
export interface Piece {
  /** Где центр черепка в собранном сосуде. */
  home: [number, number, number];
  pos: Float32Array;
  nor: Float32Array;
  uv: Float32Array;
  index: Uint32Array;
  /** Рёбра края черепка — пары вершин в порядке обхода лица: по ним строится торец. */
  edges: Uint32Array;
}

/** Склеить совпадающие вершины и найти край черепка (рёбра, которые есть только у одного треугольника). */
function toPiece(p: number[], n: number[], t: number[], scale: number, label: (x: number, y: number, z: number) => number, own: number): Piece {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    min = min.map((m, k) => Math.min(m, p[i + k]! * scale));
    max = max.map((m, k) => Math.max(m, p[i + k]! * scale));
  }
  const home: [number, number, number] = p.length ? [0, 1, 2].map((k) => (min[k]! + max[k]!) / 2) as [number, number, number] : [0, 0, 0];
  const ids = new Map<string, number>();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  // Для рёбер — вершина по одной позиции (на шве развёртки у одной точки две вершины с разной развёрткой).
  const spot = new Map<string, number>();
  const spotOf: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < p.length / 3; i++) {
    const x = p[i * 3]! * scale - home[0];
    const y = p[i * 3 + 1]! * scale - home[1];
    const z = p[i * 3 + 2]! * scale - home[2];
    const where = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    const key = `${where},${Math.round(t[i * 2]! * 1e4)},${Math.round(t[i * 2 + 1]! * 1e4)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
      pos.push(x, y, z);
      nor.push(n[i * 3]!, n[i * 3 + 1]!, n[i * 3 + 2]!);
      uv.push(t[i * 2]!, t[i * 2 + 1]!);
      let sp = spot.get(where);
      if (sp === undefined) spot.set(where, (sp = spot.size));
      spotOf.push(sp);
    }
    index.push(id);
  }
  const count = new Map<number, number>();
  const ekey = (a: number, b: number) => Math.min(spotOf[a]!, spotOf[b]!) * spot.size + Math.max(spotOf[a]!, spotOf[b]!);
  const tri = (f: (a: number, b: number) => void) => {
    for (let i = 0; i < index.length; i += 3) {
      const [a, b, c] = [index[i]!, index[i + 1]!, index[i + 2]!];
      for (const [u, v] of [[a, b], [b, c], [c, a]] as const) if (spotOf[u] !== spotOf[v]) f(u, v);
    }
  };
  tri((u, v) => count.set(ekey(u, v), (count.get(ekey(u, v)) ?? 0) + 1));
  const edges: number[] = [];
  // Ребро без пары — либо скол, либо стык мелких треугольников внутри черепка (их не видно, а место занимают):
  // скол — если сразу за ребром другой черепок; край горла и донца (v развёртки 0 или 1) — тоже край.
  const at = (i: number, k: number) => pos[i * 3 + k]! + home[k]!;
  const third = new Map<number, number>();
  for (let i = 0; i < index.length; i += 3)
    for (const [a, b, c] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]] as const) third.set(index[i + a]! * 1e6 + index[i + b]!, index[i + c]!);
  const rim = (i: number) => uv[i * 2 + 1]! < 1e-3 || uv[i * 2 + 1]! > 1 - 1e-3;
  const isCut = (u: number, v: number) => {
    if (rim(u) && rim(v)) return true;
    const w = third.get(u * 1e6 + v);
    if (w === undefined) return true;
    const m = [0, 1, 2].map((k) => (at(u, k) + at(v, k)) / 2);
    // Линия скола найдена с точностью до доли ребра — смотрим на нескольких расстояниях.
    return [0.2, 0.6, 1.2].some((d) => {
      const out = [0, 1, 2].map((k) => m[k]! + (m[k]! - at(w, k)) * d);
      return label(out[0]! / scale, out[1]! / scale, out[2]! / scale) !== own;
    });
  };
  tri((u, v) => count.get(ekey(u, v)) === 1 && isCut(u, v) && edges.push(u, v));
  return { home, pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), index: new Uint32Array(index), edges: new Uint32Array(edges) };
}

/** Толщина стенки черепка (в мире). */
export const WALL = 0.03;

/**
 * Толщина черепка: изнанка — лицо, сдвинутое внутрь по нормали, а по краю скола — торец
 * (полоса между краем лица и краем изнанки). Дёшево — делается на странице из скачанного черепка.
 */
export function solidify(piece: Piece, wall = WALL): { face: THREE.BufferGeometry; inner: THREE.BufferGeometry; rim: THREE.BufferGeometry } {
  const { pos, nor, uv, index, edges } = piece;
  const face = new THREE.BufferGeometry();
  face.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  face.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  face.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  face.setIndex(new THREE.BufferAttribute(index, 1));
  const deep = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i++) deep[i] = pos[i]! - nor[i]! * wall;
  const inner = new THREE.BufferGeometry();
  inner.setAttribute('position', new THREE.BufferAttribute(deep, 3));
  inner.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  inner.setIndex(new THREE.BufferAttribute(index, 1));
  const rim = new Float32Array(edges.length * 9);
  let o = 0;
  const put = (src: Float32Array, i: number) => {
    rim[o++] = src[i * 3]!;
    rim[o++] = src[i * 3 + 1]!;
    rim[o++] = src[i * 3 + 2]!;
  };
  for (let e = 0; e < edges.length; e += 2) {
    const a = edges[e]!;
    const b = edges[e + 1]!;
    // Порядок обхода — как у лица: торец смотрит наружу от черепка.
    for (const [src, i] of [[pos, b], [pos, a], [deep, a], [pos, b], [deep, a], [deep, b]] as const) put(src, i);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(rim, 3));
  rg.computeVertexNormals();
  return { face, inner, rim: rg };
}
/**
 * Разрезать сосуд на черепки (сотни мс, на телефоне — секунду): печётся заранее `pnpm museum:bake`,
 * на странице — только запасной путь. Сетка грубее, чем у целого сосуда, — по черепку не видно.
 */
export function cutVessel(id: string, shape: Shape, count: number): Piece[] {
  const prep = prepare(shape);
  const cutter = pieces(id, prep.pts, count);
  // Каждая вторая точка профиля (развёртка v та же) и 96 долек: черепков меньше треугольников — режется вчетверо быстрее.
  const coarse = prep.pts.filter((_, i) => i % 2 === 0 || i === prep.pts.length - 1);
  const flat = new THREE.LatheGeometry(coarse, 96, Math.PI, TAU);
  // Черепок вершины — один раз на вершину сетки (а не на каждый треугольник).
  const vp = flat.getAttribute('position');
  const vertLabel = new Int32Array(vp.count);
  for (let i = 0; i < vp.count; i++) vertLabel[i] = cutter.pieceAt(vp.getX(i), vp.getY(i), vp.getZ(i));
  const index = flat.getIndex()!;
  const pos = vp;
  const nor = flat.getAttribute('normal');
  const uv = flat.getAttribute('uv');
  const buckets = cutter.seeds.map(() => ({ p: [] as number[], n: [] as number[], t: [] as number[] }));
  // Вершина: позиция, нормаль, развёртка — для разрезания треугольников по линии скола.
  type V = number[];
  const vert = (k: number): V => [pos.getX(k), pos.getY(k), pos.getZ(k), nor.getX(k), nor.getY(k), nor.getZ(k), uv.getX(k), uv.getY(k)];
  const mix = (a: V, b: V, t: number): V => {
    const out: number[] = [];
    for (let i = 0; i < 8; i++) out.push(a[i]! + (b[i]! - a[i]!) * t);
    return out;
  };
  const label = (v: V) => cutter.pieceAt(v[0]!, v[1]!, v[2]!);
  const labelAt = (a: V, b: V, t: number) =>
    cutter.pieceAt(a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t);
  const emit = (piece: number, a: V, b: V, c: V) => {
    const bk = buckets[piece]!;
    for (const v of [a, b, c]) {
      bk.p.push(v[0]!, v[1]!, v[2]!);
      const l = Math.hypot(v[3]!, v[4]!, v[5]!) || 1;
      bk.n.push(v[3]! / l, v[4]! / l, v[5]! / l);
      bk.t.push(v[6]!, v[7]!);
    }
  };
  // Точка смены черепка на ребре — делением пополам.
  // Ребро считаем всегда от одного и того же конца — у соседних треугольников точка скола совпадает.
  const cross = (p: V, q: V, lp: number): V => {
    const flip = p[0]! > q[0]! || (p[0] === q[0] && (p[1]! > q[1]! || (p[1] === q[1] && p[2]! > q[2]!)));
    const [a, b, la] = flip ? [q, p, label(q)] : [p, q, lp];
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 7; i++) {
      const m = (lo + hi) / 2;
      if (labelAt(a, b, m) === la) lo = m;
      else hi = m;
    }
    return mix(a, b, (lo + hi) / 2);
  };
  // Треугольник на стыке черепков дробим, пока он не мелкий, и режем по линии скола (без зубцов по сетке).
  const cut = (a: V, b: V, c: V, la: number, lb: number, lc: number, depth: number): void => {
    if (la === lb && lb === lc) return emit(la, a, b, c);
    if (depth > 0) {
      const ab = mix(a, b, 0.5);
      const bc = mix(b, c, 0.5);
      const ca = mix(c, a, 0.5);
      const [lab, lbc, lca] = [label(ab), label(bc), label(ca)];
      cut(a, ab, ca, la, lab, lca, depth - 1);
      cut(ab, b, bc, lab, lb, lbc, depth - 1);
      cut(ca, bc, c, lca, lbc, lc, depth - 1);
      cut(ab, bc, ca, lab, lbc, lca, depth - 1);
      return;
    }
    // Мелкий треугольник: одна вершина «чужая» — отрезаем её уголок по точкам на рёбрах (порядок обхода сохраняем).
    const rot: [V, V, V, number, number, number] | undefined =
      la === lb ? [a, b, c, la, lb, lc] : lb === lc ? [b, c, a, lb, lc, la] : lc === la ? [c, a, b, lc, la, lb] : undefined;
    if (!rot) {
      // Три разных черепка — по центру.
      return emit(label(mix(mix(a, b, 0.5), c, 1 / 3)), a, b, c);
    }
    const [p, q, r, lp, , lr] = rot;
    const pr = cross(p, r, lp);
    const qr = cross(q, r, lp);
    emit(lp, p, q, qr);
    emit(lp, p, qr, pr);
    emit(lr, pr, qr, r);
  };
  for (let i = 0; i < index.count; i += 3) {
    const [ia, ib, ic] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const [la, lb, lc] = [vertLabel[ia]!, vertLabel[ib]!, vertLabel[ic]!];
    if (la === lb && lb === lc) {
      emit(la, vert(ia), vert(ib), vert(ic));
      continue;
    }
    cut(vert(ia), vert(ib), vert(ic), la, lb, lc, 1);
  }
  flat.dispose();
  const out = buckets.map((b, i) => toPiece(b.p, b.n, b.t, prep.scale, cutter.pieceAt, i));
  return out;
}


export interface SkinPixels {
  map: Uint8ClampedArray<ArrayBuffer>;
  rough: Uint8ClampedArray<ArrayBuffer>;
}

/** Холст для росписи: на странице — OffscreenCanvas, в скрипте выпечки — холст Node. */
export type MakeCanvas = (w: number, h: number) => { getContext(kind: '2d', o?: { willReadFrequently?: boolean }): unknown };
const offscreen: MakeCanvas = (w, h) => new OffscreenCanvas(w, h);

/** Роспись сосуда, состаривание, зерно и карта шероховатости — пиксели RGBA (TEX_W × TEX_H). Дорого — печётся заранее. */
export function paintSkin(id: string, shape: Shape, makeCanvas: MakeCanvas = offscreen): SkinPixels {
  const style = STYLES[id]!;
  const prep = prepare(shape);
  const ctx = makeCanvas(TEX_W, TEX_H).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  style.paint({ ctx, Y: (y) => TEX_H * (1 - prep.vAt(y)), rnd: rng(id) });
  // Кисть, обжиг, время: линии дрожат, краска неровная, потёртости и сколы.
  age(ctx, rng(`${id}:age`));

  const img = ctx.getImageData(0, 0, TEX_W, TEX_H);
  const d = img.data;
  const rough = new Uint8ClampedArray(TEX_W * TEX_H * 4);
  const rnd = rng(`${id}:grain`);
  for (let y = 0; y < TEX_H; y++) {
    // Кольца гончарного круга — лёгкая волна яркости вдоль профиля.
    const ring = Math.sin(y * 0.9) * 2.5 + Math.sin(y * 0.13) * 3.5;
    for (let x = 0; x < TEX_W; x++) {
      const i = (y * TEX_W + x) * 4;
      const n = (rnd() - 0.5) * 9 + ring;
      d[i] = d[i]! + n;
      d[i + 1] = d[i + 1]! + n;
      d[i + 2] = d[i + 2]! + n;
      const lum = (d[i]! * 0.3 + d[i + 1]! * 0.59 + d[i + 2]! * 0.11) / 255;
      // Аттический лак блестит, глина матовая; у остальных — ровный ангоб.
      const r = style.glaze ? (lum < 0.18 ? 0.2 : style.rough) : style.rough + lum * 0.2;
      rough[i] = rough[i + 1] = rough[i + 2] = Math.min(255, r * 255);
      rough[i + 3] = 255;
    }
  }
  return { map: d as Uint8ClampedArray<ArrayBuffer>, rough };
}

/* ---------- Файл черепков: public/museum/<сосуд>-<число>.bin ---------- */
/**
 * Формат (little-endian): u32 число черепков; на черепок — 3 × f32 `home`, 3 × f32 угол и 3 × f32 размер
 * рамки, u32 вершин, u32 индексов, u32 концов рёбер; затем вершины: позиция — 3 × u16 внутри рамки,
 * нормаль — 3 × i8, развёртка — 2 × u16; индексы и рёбра — u16 (если вершин меньше 65536) или u32.
 */
export function packPieces(list: readonly Piece[]): Uint8Array {
  const size = list.reduce((n, q) => {
    const nv = q.pos.length / 3;
    const iw = nv < 65536 ? 2 : 4;
    return n + 4 * 12 + nv * (6 + 3 + 4) + (q.index.length + q.edges.length) * iw;
  }, 4);
  const view = new DataView(new ArrayBuffer(size));
  let o = 0;
  const u32 = (x: number) => (view.setUint32(o, x, true), (o += 4));
  const f32 = (x: number) => (view.setFloat32(o, x, true), (o += 4));
  u32(list.length);
  for (const q of list) {
    const nv = q.pos.length / 3;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < q.pos.length; i++) {
      min[i % 3] = Math.min(min[i % 3]!, q.pos[i]!);
      max[i % 3] = Math.max(max[i % 3]!, q.pos[i]!);
    }
    const span = min.map((m, k) => Math.max(max[k]! - m, 1e-6));
    q.home.forEach(f32);
    min.forEach(f32);
    span.forEach(f32);
    u32(nv);
    u32(q.index.length);
    u32(q.edges.length);
    for (let i = 0; i < nv; i++) {
      for (let k = 0; k < 3; k++) view.setUint16(o + k * 2, Math.round(((q.pos[i * 3 + k]! - min[k]!) / span[k]!) * 65535), true);
      o += 6;
    }
    for (let i = 0; i < nv * 3; i++) view.setInt8(o++, Math.round(q.nor[i]! * 127));
    for (let i = 0; i < nv * 2; i++) {
      view.setUint16(o, Math.round(Math.min(1, Math.max(0, q.uv[i]!)) * 65535), true);
      o += 2;
    }
    const wide = nv >= 65536;
    for (const x of [...q.index, ...q.edges]) {
      if (wide) view.setUint32(o, x, true);
      else view.setUint16(o, x, true);
      o += wide ? 4 : 2;
    }
  }
  return new Uint8Array(view.buffer);
}

export function unpackPieces(buf: ArrayBuffer): Piece[] {
  const view = new DataView(buf);
  let o = 0;
  const u32 = () => ((o += 4), view.getUint32(o - 4, true));
  const f32 = () => ((o += 4), view.getFloat32(o - 4, true));
  return Array.from({ length: u32() }, () => {
    const home: [number, number, number] = [f32(), f32(), f32()];
    const min = [f32(), f32(), f32()];
    const span = [f32(), f32(), f32()];
    const nv = u32();
    const ni = u32();
    const ne = u32();
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) {
      pos[i] = min[i % 3]! + (view.getUint16(o, true) / 65535) * span[i % 3]!;
      o += 2;
    }
    const nor = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      const [x, y, z] = [view.getInt8(o), view.getInt8(o + 1), view.getInt8(o + 2)];
      o += 3;
      const l = Math.hypot(x, y, z) || 1;
      nor.set([x / l, y / l, z / l], i * 3);
    }
    const uv = new Float32Array(nv * 2);
    for (let i = 0; i < nv * 2; i++) {
      uv[i] = view.getUint16(o, true) / 65535;
      o += 2;
    }
    const wide = nv >= 65536;
    const ints = (n: number) => {
      const a = new Uint32Array(n);
      for (let i = 0; i < n; i++) {
        a[i] = wide ? view.getUint32(o, true) : view.getUint16(o, true);
        o += wide ? 4 : 2;
      }
      return a;
    };
    return { home, pos, nor, uv, index: ints(ni), edges: ints(ne) };
  });
}

/* ---------- Ручки ---------- */
export type Handle = (typeof SHAPES)[Shape]['handles'][number];

/** Радиус наружной стенки на высоте `y` (по профилю до верха). */
export function radiusAt(pts: readonly THREE.Vector2[], y: number): number {
  const top = pts.reduce((m, p, i) => (p.y > pts[m]!.y ? i : m), 0);
  for (let i = 1; i <= top; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (b.y >= y) return a.x + ((b.x - a.x) * (y - a.y)) / Math.max(1e-6, b.y - a.y);
  }
  return pts[top]!.x;
}

/** Ось ручки (в координатах профиля, до масштаба). */
export function handleCurve(shape: Shape, h: Handle): THREE.CatmullRomCurve3 {
  const phi = Math.PI + h.u * TAU;
  const out = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
  const side = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi));
  const { pts } = prepare(shape);
  const thick = SHAPES[shape].thick ?? 0.034;
  // Концы ручки — на поверхности сосуда и чуть утоплены в стенку: ручка прилеплена, а не висит рядом.
  const at = ([r, y, t = 0]: readonly [number, number, number?], end: boolean) => {
    const rr = end ? Math.sqrt(Math.max(0, radiusAt(pts, y) ** 2 - t * t)) - thick * 0.6 : r;
    return out.clone().multiplyScalar(rr).addScaledVector(side, t).setY(y);
  };
  const last = h.pts.length - 1;
  const ends = h.pts.map((q, i) => at(q, i === 0 || i === last));
  // Ещё по точке внутрь стенки — трубка входит в тулово, без зазора на изгибе.
  const sink = (p: THREE.Vector3) => p.clone().addScaledVector(out, -thick * 1.5);
  return new THREE.CatmullRomCurve3([sink(ends[0]!), ...ends, sink(ends[last]!)]);
}

/* ---------- Портрет для полки: вид спереди, без 3D на странице ---------- */

/** Мир → пиксели портрета. */
const sx = (x: number) => PORTRAIT_W / 2 + x * PX;
const sy = (y: number) => PORTRAIT_H - (y - FLOOR) * PX;
/** Сосуд повёрнут, как на витрине. */
const TURN = 0.5;

/**
 * Портрет сосуда спереди (прозрачный фон): роспись натянута на тело вращения, свет слева сверху, ручки —
 * трубками; и силуэт (маска) той же формы. Считается по пикселям в скрипте выпечки — страница берёт картинки.
 */
export function paintPortrait(id: string, shape: Shape, skin: Uint8ClampedArray, makeCanvas: MakeCanvas = offscreen): { photo: Uint8ClampedArray<ArrayBuffer>; mask: Uint8ClampedArray<ArrayBuffer> } {
  const prep = prepare(shape);
  const s = prep.scale;
  const top = Math.max(...prep.pts.map((p) => p.y));
  const ctx = makeCanvas(PORTRAIT_W, PORTRAIT_H).getContext('2d') as OffscreenCanvasRenderingContext2D;
  const light = new THREE.Vector3(-0.45, 0.55, 0.7).normalize();
  // Ручки: сзади тулова — до него, спереди — после.
  const tubes = SHAPES[shape].handles.map((h) =>
    handleCurve(shape, h)
      .getPoints(60)
      .map((p) => {
        const q = p.clone().multiplyScalar(s).applyAxisAngle(new THREE.Vector3(0, 1, 0), -TURN);
        return q;
      }),
  );
  const thick = (SHAPES[shape].thick ?? 0.034) * s;
  const handleColor = STYLES[id]!.handle;
  const drawTubes = (front: boolean) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const t of tubes) {
      for (let i = 1; i < t.length; i++) {
        const a = t[i - 1]!;
        const b = t[i]!;
        if (a.z + b.z >= 0 !== front) continue;
        // Тень на нижней стороне трубки, блик — на верхней.
        for (const [w, dy, color, alpha] of [
          [thick * 2, 0, handleColor, 1],
          [thick * 0.8, -thick * 0.45, '#ffffff', 0.18],
        ] as const) {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = w * PX;
          ctx.beginPath();
          ctx.moveTo(sx(a.x), sy(a.y) + dy * PX);
          ctx.lineTo(sx(b.x), sy(b.y) + dy * PX);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  };
  drawTubes(false);
  // Тулово — по строкам: радиус и развёртка на высоте строки, долгота — по x.
  const img = ctx.getImageData(0, 0, PORTRAIT_W, PORTRAIT_H);
  const d = img.data;
  for (let py = 0; py < PORTRAIT_H; py++) {
    const yw = FLOOR + (PORTRAIT_H - py - 0.5) / PX;
    const y = yw / s;
    if (y < 0 || y > top) continue;
    const r = radiusAt(prep.pts, y) * s;
    if (r <= 0) continue;
    // Наклон стенки — для нормали.
    const dr = (radiusAt(prep.pts, y + 0.01) - radiusAt(prep.pts, y - 0.01)) / 0.02;
    const ny0 = -dr / Math.hypot(1, dr);
    const nr = 1 / Math.hypot(1, dr);
    const row = Math.min(TEX_H - 1, Math.max(0, Math.round(TEX_H * (1 - prep.vAt(y)))));
    for (let px = 0; px < PORTRAIT_W; px++) {
      const xw = (px + 0.5 - PORTRAIT_W / 2) / PX;
      if (Math.abs(xw) >= r) continue;
      const zw = Math.sqrt(r * r - xw * xw);
      const phi = Math.atan2(xw, zw) + TURN;
      const u = (((phi - Math.PI) / TAU) % 1 + 1) % 1;
      const col = Math.min(TEX_W - 1, Math.floor(u * TEX_W));
      const t = (row * TEX_W + col) * 4;
      const n = new THREE.Vector3((nr * xw) / r, ny0, (nr * zw) / r);
      const shade = 0.42 + 0.75 * Math.max(0, n.dot(light));
      // Край силуэта — мягко.
      const edge = Math.min(1, (r - Math.abs(xw)) * PX);
      const o = (py * PORTRAIT_W + px) * 4;
      for (let k = 0; k < 3; k++) d[o + k] = d[o + k]! * (1 - edge) + Math.min(255, skin[t + k]! * shade) * edge;
      d[o + 3] = Math.max(d[o + 3]!, edge * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  drawTubes(true);
  const photo = ctx.getImageData(0, 0, PORTRAIT_W, PORTRAIT_H).data as Uint8ClampedArray<ArrayBuffer>;
  const mask = new Uint8ClampedArray(photo.length);
  for (let i = 0; i < photo.length; i += 4) mask[i + 3] = photo[i + 3]!;
  return { photo, mask };
}
