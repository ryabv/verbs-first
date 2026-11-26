/**
 * Черепки скана: резка сетки на ячейки Вороного по поверхности, толщина черепка, файл черепков.
 * Режет скрипт `pnpm museum:bake` (на число дней месяца сосуда); на странице — только перерезка, если месяц
 * другой длины (сосуд пошёл по кругу): черепки из файла склеиваются в сетку и режутся заново.
 * Без DOM — работает и в Node.
 */
import * as THREE from 'three';

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

/** Высота сосуда на постаменте и предельный радиус (в мире сцены): скан при выпечке вписан в них и стоит на y = 0. */
export const FIT_H = 2.1;
export const FIT_R = 0.95;

/** Портрет для полки: кадр в пикселях, пикселей на единицу мира, нижний край кадра в мире. */
export const PORTRAIT_W = 240;
export const PORTRAIT_H = 300;
export const PX = 112;
export const FLOOR = -0.12;

/** Сетка — «суп» треугольников по индексу: у каждого треугольника свой материал (номер материала в GLB скана). */
export interface Mesh {
  pos: Float32Array;
  nor: Float32Array;
  uv: Float32Array;
  index: Uint32Array;
  /** Материал треугольника. */
  mat: Uint8Array;
}

/** Черепок как данные: лицо — индексированная сетка (вершины уже сдвинуты к центру черепка), край скола — рёбра. */
export interface Piece {
  /** Где центр черепка в собранном сосуде. */
  home: [number, number, number];
  pos: Float32Array;
  nor: Float32Array;
  uv: Float32Array;
  /** Треугольники по материалам: `groups` — тройки (начало в `index`, длина, материал). */
  index: Uint32Array;
  groups: Uint32Array;
  /** Рёбра края черепка — пары вершин в порядке обхода лица: по ним строится торец. */
  edges: Uint32Array;
}

const posKey = (x: number, y: number, z: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;

/** Вершины края самой сетки (рёбра, которые есть только у одного треугольника): горло, отбитые места скана. */
function borderOf(mesh: Mesh): Set<string> {
  const keys: string[] = [];
  for (let i = 0; i < mesh.pos.length / 3; i++) keys.push(posKey(mesh.pos[i * 3]!, mesh.pos[i * 3 + 1]!, mesh.pos[i * 3 + 2]!));
  const id = new Map<string, number>();
  const spot = keys.map((k) => id.get(k) ?? (id.set(k, id.size), id.size - 1));
  const count = new Map<number, number>();
  const ek = (a: number, b: number) => Math.min(a, b) * id.size + Math.max(a, b);
  for (let i = 0; i < mesh.index.length; i += 3)
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]] as const) {
      const k = ek(spot[mesh.index[i + a]!]!, spot[mesh.index[i + b]!]!);
      count.set(k, (count.get(k) ?? 0) + 1);
    }
  const out = new Set<string>();
  for (let i = 0; i < mesh.index.length; i += 3)
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]] as const) {
      const [u, v] = [mesh.index[i + a]!, mesh.index[i + b]!];
      if (count.get(ek(spot[u]!, spot[v]!)) === 1) out.add(keys[u]!).add(keys[v]!);
    }
  return out;
}

/** Затравки черепков — равномерно по поверхности: из многих случайных точек (по площади) — каждая следующая дальше всех от выбранных. */
function seedsOn(mesh: Mesh, count: number, rnd: () => number): [number, number, number][] {
  const { pos, index } = mesh;
  const tris = index.length / 3;
  const area = new Float64Array(tris);
  let total = 0;
  const v = (i: number) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  for (let t = 0; t < tris; t++) {
    const [a, b, c] = [v(index[t * 3]!), v(index[t * 3 + 1]!), v(index[t * 3 + 2]!)];
    total += new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).length() / 2;
    area[t] = total;
  }
  const candidates: [number, number, number][] = [];
  for (let n = 0; n < count * 40; n++) {
    const r = rnd() * total;
    let lo = 0;
    let hi = tris - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (area[m]! < r) lo = m + 1;
      else hi = m;
    }
    let s = rnd();
    let q = rnd();
    if (s + q > 1) [s, q] = [1 - s, 1 - q];
    const [a, b, c] = [v(index[lo * 3]!), v(index[lo * 3 + 1]!), v(index[lo * 3 + 2]!)];
    const p = a.clone().addScaledVector(b.sub(a), s).addScaledVector(c.sub(a), q);
    candidates.push([p.x, p.y, p.z]);
  }
  const out = [candidates[0]!];
  const dist = candidates.map((p) => Math.hypot(p[0] - out[0]![0], p[1] - out[0]![1], p[2] - out[0]![2]));
  while (out.length < count) {
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[best]!) best = i;
    const p = candidates[best]!;
    out.push(p);
    for (let i = 0; i < dist.length; i++) dist[i] = Math.min(dist[i]!, Math.hypot(candidates[i]![0] - p[0], candidates[i]![1] - p[1], candidates[i]![2] - p[2]));
  }
  return out;
}

/** Склеить совпадающие вершины, разложить треугольники по материалам и найти край черепка. */
function toPiece(p: number[], n: number[], t: number[], m: number[], label: (x: number, y: number, z: number) => number, own: number, border: Set<string>): Piece {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i++) {
    min[i % 3] = Math.min(min[i % 3]!, p[i]!);
    max[i % 3] = Math.max(max[i % 3]!, p[i]!);
  }
  const home: [number, number, number] = p.length ? ([0, 1, 2].map((k) => (min[k]! + max[k]!) / 2) as [number, number, number]) : [0, 0, 0];
  const ids = new Map<string, number>();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  // Для рёбер — вершина по одной позиции (на шве развёртки у одной точки несколько вершин с разной развёрткой).
  const spot = new Map<string, number>();
  const spotOf: number[] = [];
  const onBorder: boolean[] = [];
  const corner: number[] = [];
  for (let i = 0; i < p.length / 3; i++) {
    const where = posKey(p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!);
    const key = `${where},${Math.round(t[i * 2]! * 1e5)},${Math.round(t[i * 2 + 1]! * 1e5)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
      pos.push(p[i * 3]! - home[0], p[i * 3 + 1]! - home[1], p[i * 3 + 2]! - home[2]);
      nor.push(n[i * 3]!, n[i * 3 + 1]!, n[i * 3 + 2]!);
      uv.push(t[i * 2]!, t[i * 2 + 1]!);
      let sp = spot.get(where);
      if (sp === undefined) spot.set(where, (sp = spot.size));
      spotOf.push(sp);
      onBorder.push(border.has(where));
    }
    corner.push(id);
  }
  // Треугольники — по материалам подряд: у каждого материала свой кусок индекса.
  const order = Array.from({ length: m.length }, (_, i) => i).toSorted((a, b) => m[a]! - m[b]!);
  const index: number[] = [];
  const groups: number[] = [];
  for (const tri of order) {
    const mat = m[tri]!;
    if (groups.length === 0 || groups[groups.length - 1]! !== mat) groups.push(index.length, 0, mat);
    index.push(corner[tri * 3]!, corner[tri * 3 + 1]!, corner[tri * 3 + 2]!);
    groups[groups.length - 2]! += 3;
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
  // Ребро без пары — либо скол, либо стык мелких треугольников внутри черепка (их не видно, а место занимают):
  // скол — если сразу за ребром другой черепок; край самой сетки (горло) — тоже край.
  const at = (i: number, k: number) => pos[i * 3 + k]! + home[k]!;
  const third = new Map<number, number>();
  for (let i = 0; i < index.length; i += 3)
    for (const [a, b, c] of [[0, 1, 2], [1, 2, 0], [2, 0, 1]] as const) third.set(index[i + a]! * 1e6 + index[i + b]!, index[i + c]!);
  const isCut = (u: number, v: number) => {
    if (onBorder[u] && onBorder[v]) return true;
    const w = third.get(u * 1e6 + v);
    if (w === undefined) return true;
    const mid = [0, 1, 2].map((k) => (at(u, k) + at(v, k)) / 2);
    // Линия скола найдена с точностью до доли ребра — смотрим на нескольких расстояниях.
    return [0.2, 0.6, 1.2].some((d) => {
      const out = [0, 1, 2].map((k) => mid[k]! + (mid[k]! - at(w, k)) * d);
      return label(out[0]!, out[1]!, out[2]!) !== own;
    });
  };
  const edges: number[] = [];
  tri((u, v) => count.get(ekey(u, v)) === 1 && isCut(u, v) && edges.push(u, v));
  return {
    home,
    pos: new Float32Array(pos),
    nor: new Float32Array(nor),
    uv: new Float32Array(uv),
    index: new Uint32Array(index),
    groups: new Uint32Array(groups),
    edges: new Uint32Array(edges),
  };
}

/**
 * Разрезать сетку сосуда на `count` черепков (сотни мс): ячейки Вороного по поверхности, линия скола «плывёт»
 * плавным шумом — край неровный, но гладкий. Треугольники на стыке дробятся и режутся по линии скола.
 */
export function cutMesh(id: string, mesh: Mesh, count: number): Piece[] {
  const seeds = seedsOn(mesh, count, rng(`${id}:pieces`));
  const label = (px: number, py: number, pz: number) => {
    const x = px + 0.06 * Math.sin(py * 4.5 + pz * 2.5) + 0.02 * Math.sin(pz * 11.5 + py * 8.5);
    const y = py + 0.05 * Math.sin(px * 4 + pz * 3.5) + 0.017 * Math.sin(px * 10.5 - pz * 9.5);
    const z = pz + 0.06 * Math.sin(px * 3 - py * 4.5) + 0.02 * Math.sin(py * 12.5 + px * 6.5);
    let a = Infinity;
    let ia = 0;
    for (let i = 0; i < seeds.length; i++) {
      const [sx, sy, sz] = seeds[i]!;
      const d = (x - sx) ** 2 + (y - sy) ** 2 + (z - sz) ** 2;
      if (d < a) {
        a = d;
        ia = i;
      }
    }
    return ia;
  };
  const { pos, nor, uv, index, mat } = mesh;
  const vertLabel = new Int32Array(pos.length / 3);
  for (let i = 0; i < vertLabel.length; i++) vertLabel[i] = label(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!);
  const buckets = seeds.map(() => ({ p: [] as number[], n: [] as number[], t: [] as number[], m: [] as number[] }));
  // Вершина: позиция, нормаль, развёртка — для разрезания треугольников по линии скола.
  type V = number[];
  const vert = (k: number): V => [pos[k * 3]!, pos[k * 3 + 1]!, pos[k * 3 + 2]!, nor[k * 3]!, nor[k * 3 + 1]!, nor[k * 3 + 2]!, uv[k * 2]!, uv[k * 2 + 1]!];
  const mix = (a: V, b: V, t: number): V => a.map((x, i) => x + (b[i]! - x) * t);
  const labelOf = (v: V) => label(v[0]!, v[1]!, v[2]!);
  const labelAt = (a: V, b: V, t: number) => label(a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t);
  let triMat = 0;
  const emit = (piece: number, a: V, b: V, c: V) => {
    const bk = buckets[piece]!;
    for (const v of [a, b, c]) {
      bk.p.push(v[0]!, v[1]!, v[2]!);
      const l = Math.hypot(v[3]!, v[4]!, v[5]!) || 1;
      bk.n.push(v[3]! / l, v[4]! / l, v[5]! / l);
      bk.t.push(v[6]!, v[7]!);
    }
    bk.m.push(triMat);
  };
  // Точка смены черепка на ребре — делением пополам; ребро всегда от одного конца — у соседей точка совпадает.
  const cross = (p: V, q: V, lp: number): V => {
    const flip = p[0]! > q[0]! || (p[0] === q[0] && (p[1]! > q[1]! || (p[1] === q[1] && p[2]! > q[2]!)));
    const [a, b, la] = flip ? [q, p, labelOf(q)] : [p, q, lp];
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 7; i++) {
      const m = (lo + hi) / 2;
      if (labelAt(a, b, m) === la) lo = m;
      else hi = m;
    }
    return mix(a, b, (lo + hi) / 2);
  };
  const cut = (a: V, b: V, c: V, la: number, lb: number, lc: number, depth: number): void => {
    if (la === lb && lb === lc) return emit(la, a, b, c);
    if (depth > 0) {
      const ab = mix(a, b, 0.5);
      const bc = mix(b, c, 0.5);
      const ca = mix(c, a, 0.5);
      const [lab, lbc, lca] = [labelOf(ab), labelOf(bc), labelOf(ca)];
      cut(a, ab, ca, la, lab, lca, depth - 1);
      cut(ab, b, bc, lab, lb, lbc, depth - 1);
      cut(ca, bc, c, lca, lbc, lc, depth - 1);
      cut(ab, bc, ca, lab, lbc, lca, depth - 1);
      return;
    }
    // Одна вершина «чужая» — отрезаем её уголок по точкам на рёбрах (порядок обхода сохраняем).
    const rot: [V, V, V, number, number] | undefined =
      la === lb ? [a, b, c, la, lc] : lb === lc ? [b, c, a, lb, la] : lc === la ? [c, a, b, lc, lb] : undefined;
    if (!rot) return emit(labelOf(mix(mix(a, b, 0.5), c, 1 / 3)), a, b, c);
    const [p, q, r, lp, lr] = rot;
    const pr = cross(p, r, lp);
    const qr = cross(q, r, lp);
    emit(lp, p, q, qr);
    emit(lp, p, qr, pr);
    emit(lr, pr, qr, r);
  };
  for (let i = 0; i < index.length; i += 3) {
    triMat = mat[i / 3]!;
    const [ia, ib, ic] = [index[i]!, index[i + 1]!, index[i + 2]!];
    const [la, lb, lc] = [vertLabel[ia]!, vertLabel[ib]!, vertLabel[ic]!];
    if (la === lb && lb === lc) emit(la, vert(ia), vert(ib), vert(ic));
    else cut(vert(ia), vert(ib), vert(ic), la, lb, lc, 1);
  }
  const border = borderOf(mesh);
  return buckets.map((b, i) => toPiece(b.p, b.n, b.t, b.m, label, i, border));
}

/** Черепки обратно в одну сетку — чтобы перерезать на другое число (месяц другой длины). */
export function mergePieces(list: readonly Piece[]): Mesh {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const mat: number[] = [];
  for (const q of list) {
    const base = pos.length / 3;
    for (let i = 0; i < q.pos.length; i++) pos.push(q.pos[i]! + q.home[i % 3]!);
    nor.push(...q.nor);
    uv.push(...q.uv);
    for (let g = 0; g < q.groups.length; g += 3) {
      const [start, len, m] = [q.groups[g]!, q.groups[g + 1]!, q.groups[g + 2]!];
      for (let i = start; i < start + len; i++) index.push(q.index[i]! + base);
      for (let i = 0; i < len / 3; i++) mat.push(m);
    }
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), index: new Uint32Array(index), mat: new Uint8Array(mat) };
}

/** Толщина стенки черепка (в мире). */
export const WALL = 0.03;

/**
 * Толщина черепка: изнанка — лицо, сдвинутое внутрь по нормали, а по краю скола — торец
 * (полоса между краем лица и краем изнанки). Дёшево — делается на странице из скачанного черепка.
 * У лица — группы по материалам скана (`addGroup`, номер материала — `materialIndex`).
 */
export function solidify(piece: Piece, wall = WALL): { face: THREE.BufferGeometry; inner: THREE.BufferGeometry; rim: THREE.BufferGeometry } {
  const { pos, nor, uv, index, groups, edges } = piece;
  const face = new THREE.BufferGeometry();
  face.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  face.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  face.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  face.setIndex(new THREE.BufferAttribute(index, 1));
  for (let g = 0; g < groups.length; g += 3) face.addGroup(groups[g]!, groups[g + 1]!, groups[g + 2]!);
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

/** Рамка значений по каждой оси: угол и размер — для упаковки в u16. */
function frame(a: Float32Array, dim: number) {
  const min = Array.from({ length: dim }, () => Infinity);
  const max = Array.from({ length: dim }, () => -Infinity);
  for (let i = 0; i < a.length; i++) {
    min[i % dim] = Math.min(min[i % dim]!, a[i]!);
    max[i % dim] = Math.max(max[i % dim]!, a[i]!);
  }
  return { min, span: min.map((m, k) => Math.max(max[k]! - m, 1e-6)) };
}

/* ---------- Файл черепков: public/museum/<сосуд>-<число>.bin ---------- */
/**
 * Формат (little-endian): u32 число черепков; на черепок — 3 × f32 `home`, рамки позиций и развёртки
 * (3 × f32 угол, 3 × f32 размер, 2 × f32 угол, 2 × f32 размер), u32 вершин, u32 индексов, u32 групп, u32 концов рёбер;
 * затем вершины: позиция — 3 × u16 внутри рамки, нормаль — 3 × i8, развёртка — 2 × u16 внутри рамки;
 * группы — тройки u32; индексы и рёбра — u16 (если вершин меньше 65536) или u32.
 */
export function packPieces(list: readonly Piece[]): Uint8Array {
  const size = list.reduce((n, q) => {
    const nv = q.pos.length / 3;
    const iw = nv < 65536 ? 2 : 4;
    return n + 4 * 17 + nv * (6 + 3 + 4) + q.groups.length * 4 + (q.index.length + q.edges.length) * iw;
  }, 4);
  const view = new DataView(new ArrayBuffer(size));
  let o = 0;
  const u32 = (x: number) => (view.setUint32(o, x, true), (o += 4));
  const f32 = (x: number) => (view.setFloat32(o, x, true), (o += 4));
  u32(list.length);
  for (const q of list) {
    const nv = q.pos.length / 3;
    const fp = frame(q.pos, 3);
    const ft = frame(q.uv, 2);
    q.home.forEach(f32);
    fp.min.forEach(f32);
    fp.span.forEach(f32);
    ft.min.forEach(f32);
    ft.span.forEach(f32);
    u32(nv);
    u32(q.index.length);
    u32(q.groups.length / 3);
    u32(q.edges.length);
    for (let i = 0; i < nv * 3; i++) {
      view.setUint16(o, Math.round(((q.pos[i]! - fp.min[i % 3]!) / fp.span[i % 3]!) * 65535), true);
      o += 2;
    }
    for (let i = 0; i < nv * 3; i++) view.setInt8(o++, Math.round(q.nor[i]! * 127));
    for (let i = 0; i < nv * 2; i++) {
      view.setUint16(o, Math.round(((q.uv[i]! - ft.min[i % 2]!) / ft.span[i % 2]!) * 65535), true);
      o += 2;
    }
    q.groups.forEach(u32);
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
    const pMin = [f32(), f32(), f32()];
    const pSpan = [f32(), f32(), f32()];
    const tMin = [f32(), f32()];
    const tSpan = [f32(), f32()];
    const nv = u32();
    const ni = u32();
    const ng = u32();
    const ne = u32();
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) {
      pos[i] = pMin[i % 3]! + (view.getUint16(o, true) / 65535) * pSpan[i % 3]!;
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
      uv[i] = tMin[i % 2]! + (view.getUint16(o, true) / 65535) * tSpan[i % 2]!;
      o += 2;
    }
    const groups = new Uint32Array(ng * 3);
    for (let i = 0; i < ng * 3; i++) groups[i] = u32();
    const wide = nv >= 65536;
    const ints = (n: number) => {
      const a = new Uint32Array(n);
      for (let i = 0; i < n; i++) {
        a[i] = wide ? view.getUint32(o, true) : view.getUint16(o, true);
        o += wide ? 4 : 2;
      }
      return a;
    };
    return { home, pos, nor, uv, index: ints(ni), groups, edges: ints(ne) };
  });
}
