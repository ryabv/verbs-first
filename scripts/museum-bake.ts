/**
 * Выпечка музея — из исходников сканов (`.museum-src/<сосуд>.glb`, `pnpm museum:fetch`) в public/museum/:
 * - `<сосуд>.glb` — скан для сайта: сосуд вписан в FIT_H × FIT_R и стоит на y = 0; сетка упрощена с ограничением
 *   ошибки (швы развёртки не трогаем — иначе проступает фон текстуры), текстуры 2048 WebP, Draco;
 * - `<сосуд>-<дней>.bin` — черепки на число дней месяца сосуда (упрощённая копия скана);
 * - `<сосуд>-<дней>/` — черепок каждого дня отдельно для праздника находки: `index.json` (смещения в `.bin`,
 *   материалы) и вырезы текстуры `<день>-<материал>.webp` — грузится один черепок, а не весь сосуд;
 * - `<сосуд>-photo.webp`, `<сосуд>-mask.png` — портрет и силуэт для полки (растеризация здесь же, вид спереди);
 * - `src/entities/vessel/data/baked.ts` — где сосуд в кадре портрета; `public/draco/` — декодер Draco.
 * Запуск: `pnpm museum:bake` — после правок каталога (сканы, месяцы) или резки (`lib/shards.ts`).
 */
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NodeIO, type Document, type Texture } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { cloneDocument, dedup, draco, flatten, getBounds, metalRough, prune, simplify, textureCompress, transformMesh, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { VESSELS } from '../src/entities/vessel/data/catalog';
import { cutMesh, findOrder, FIT_H, FIT_R, FLOOR, packPieces, PORTRAIT_H, PORTRAIT_W, PX, type Mesh, type Piece, type ShardIndex } from '../src/entities/vessel/lib/shards';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, '.museum-src');
const OUT = path.join(ROOT, 'public/museum');

/**
 * Настройки сосудов: `error` — допуск упрощения сетки (доля размера сосуда; по умолчанию 0,0001 — незаметно и вблизи;
 * у сканов с миллионами треугольников крупнее — проверено сравнением с исходником вблизи), `yaw` — поворот (градусы),
 * чтобы спереди была главная сцена; `lid` — часть имени материала крышки: в скане она лежит отдельно — кладём на горло.
 */
/**
 * `level` — скан снят с наклоном: `base` — поставить на ножку, `rim` — выровнять по венчику (если ножка неровная).
 * Только по списку: у круглого дна поиск ошибается.
 */
const TUNE: Record<string, { error?: number; yaw?: number; lid?: string; level?: 'base' | 'rim' }> = {
  'geo-pyxis': { lid: 'lid' },
  'bf-olbia-krater': { error: 0.003 },
  'cle-1970-16': { yaw: 180 },
  'rf-fitz-theseus': { yaw: 135, level: 'rim' },
  'bf-utas-gv44': { error: 0.003 },
  'rf-krakow-pelike': { yaw: 270 },
};
/** Для подбора: `ONLY=<сосуд>` — испечь только его (остальное в public/museum не трогаем), `YAW=<градусы>` — поворот. */
const ONLY = process.env.ONLY;
/** Черепки режем по упрощённой копии: столько треугольников хватает, чтобы край скола был гладким. */
const SHARD_TRIS = 24000;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;

if (!ONLY) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
const write = (file: string, data: Uint8Array) => {
  mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  writeFileSync(path.join(OUT, file), data);
  bytes += data.byteLength;
};

const meshNodes = (doc: Document) => doc.getRoot().listNodes().filter((n) => n.getMesh());
const triangles = (doc: Document) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + (p.getIndices() ?? p.getAttribute('POSITION')!).getCount() / 3, 0);

type Mat4 = Parameters<typeof transformMesh>[1];
const m4 = (m: THREE.Matrix4) => m.elements as unknown as Mat4;

/** Направление, вдоль которого точки разбросаны меньше всего (нормаль «плоской» части), — степенным методом. */
function flattest(pts: THREE.Vector3[]): { normal: THREE.Vector3; center: THREE.Vector3 } {
  const center = pts.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(pts.length);
  const c = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of pts) {
    const d = [p.x - center.x, p.y - center.y, p.z - center.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[i * 3 + j]! += d[i]! * d[j]!;
  }
  const tr = c[0]! + c[4]! + c[8]!;
  let v = new THREE.Vector3(0.3, 1, 0.2).normalize();
  for (let k = 0; k < 200; k++) {
    const a = [v.x, v.y, v.z];
    // (tr·I − C)·v: самый большой собственный вектор этой матрицы — самый маленький у C.
    v = new THREE.Vector3(...([0, 1, 2].map((i) => tr * a[i]! - (c[i * 3]! * a[0]! + c[i * 3 + 1]! * a[1]! + c[i * 3 + 2]! * a[2]!)) as [number, number, number])).normalize();
  }
  return { normal: v, center };
}

const positions = (meshes: readonly Mesh_[]) =>
  meshes.flatMap((m) =>
    m.listPrimitives().flatMap((p) => {
      const a = p.getAttribute('POSITION')!;
      return Array.from({ length: a.getCount() }, (_, i) => new THREE.Vector3(...(a.getElement(i, [0, 0, 0]) as [number, number, number])));
    }),
  );
/** Направление, отклонённое от +Y на углы ax (к X) и az (к Z). */
const dir = (ax: number, az: number) => new THREE.Vector3(Math.sin(ax), 1, Math.sin(az)).normalize();

/**
 * Наклон скана: сосуд ставим на ножку (для венчика — те же точки, перевёрнутые). Перебираем направления «вниз» в конусе 25° от −Y и берём то, у которого
 * в опорной плоскости (касательной снизу) лежит больше всего точек — кольцо ножки или плоское дно.
 * Сначала грубо (шаг 1°), потом точнее (0,1°). Возвращает поворот найденного «вниз» к −Y.
 */
function upright(all: readonly THREE.Vector3[]): THREE.Quaternion {
  const lo = all.reduce((a, p) => Math.min(a, p.y), Infinity);
  const hi = all.reduce((a, p) => Math.max(a, p.y), -Infinity);
  const h = hi - lo;
  const low = all.filter((p) => p.y < lo + 0.3 * h);
  const step = Math.max(1, Math.floor(low.length / 60_000));
  const pts = low.filter((_, i) => i % step === 0);
  const eps = 0.004 * h;
  const score = (n: THREE.Vector3) => {
    let d = Infinity;
    for (const p of pts) d = Math.min(d, p.dot(n));
    let c = 0;
    for (const p of pts) if (p.dot(n) < d + eps) c++;
    return c;
  };
  const search = (cx: number, cz: number, span: number, inc: number) => {
    let best = { ax: cx, az: cz, c: -1 };
    for (let ax = cx - span; ax <= cx + span + 1e-9; ax += inc)
      for (let az = cz - span; az <= cz + span + 1e-9; az += inc) {
        const c = score(dir(ax, az));
        if (c > best.c) best = { ax, az, c };
      }
    return best;
  };
  const deg = Math.PI / 180;
  const coarse = search(0, 0, 25 * deg, 1 * deg);
  const fine = search(coarse.ax, coarse.az, 1.5 * deg, 0.1 * deg);
  // dir — «вверх» сосуда (нормаль опорной плоскости внутрь): её — к +Y.
  return new THREE.Quaternion().setFromUnitVectors(dir(fine.ax, fine.az), new THREE.Vector3(0, 1, 0));
}
type Mesh_ = NonNullable<ReturnType<Document['getRoot']>['listMeshes']>[number];

/**
 * Сосуд стоит на y = 0, ось — по центру, вписан в FIT_H × FIT_R; повороты узлов — в вершины.
 * Крышка (`lid`) — выровнять по её плоскости (ручкой вверх) и положить на горло.
 */
async function normalize(doc: Document, yaw: number, lid?: string, upright_?: 'base' | 'rim') {
  await doc.transform(flatten());
  for (const node of meshNodes(doc)) {
    transformMesh(node.getMesh()!, node.getWorldMatrix());
    node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  }
  const meshes = meshNodes(doc).map((n) => n.getMesh()!);
  const bounds = () => getBounds(doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]!);
  if (lid) {
    const isLid = (m: Mesh_) => m.listPrimitives().some((p) => p.getMaterial()?.getName().includes(lid));
    const lids = meshes.filter(isLid);
    const body = positions(meshes.filter((m) => !isLid(m)));
    const lp = positions(lids);
    const { normal, center } = flattest(lp);
    // Ручка крышки торчит дальше от центра — эту сторону вверх.
    const along = lp.map((p) => p.clone().sub(center).dot(normal));
    if (along.reduce((a, x) => Math.max(a, x), -Infinity) < -along.reduce((a, x) => Math.min(a, x), Infinity)) normal.negate();
    const turn = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0)));
    const turned = lp.map((p) => p.clone().sub(center).applyMatrix4(turn));
    const top = body.reduce((a, p) => Math.max(a, p.y), -Infinity);
    const mid = body.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(body.length);
    const low = turned.reduce((a, p) => Math.min(a, p.y), Infinity);
    const put = new THREE.Matrix4().makeTranslation(mid.x, top - low, mid.z).multiply(turn).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
    for (const m of lids) transformMesh(m, m4(put));
  }
  const level =
    upright_ === 'rim' ? upright(positions(meshes).map((p) => p.negate())) : upright(positions(meshes));
  const tilt = (2 * Math.acos(Math.min(1, Math.abs(level.w))) * 180) / Math.PI;
  console.log(`  наклон скана ${tilt.toFixed(1)}°${upright_ ? ' — выпрямлен' : ''}`);
  const turn = new THREE.Matrix4().makeRotationY((yaw * Math.PI) / 180);
  if (upright_) turn.multiply(new THREE.Matrix4().makeRotationFromQuaternion(level));
  for (const m of meshes) transformMesh(m, m4(turn));
  const { min, max } = bounds();
  const s = Math.min(FIT_H / (max[1] - min[1]), (2 * FIT_R) / Math.max(max[0] - min[0], max[2] - min[2]));
  const fit = new THREE.Matrix4().makeScale(s, s, s).premultiply(new THREE.Matrix4().makeTranslation(-((min[0] + max[0]) / 2) * s, -min[1] * s, -((min[2] + max[2]) / 2) * s));
  for (const m of meshes) transformMesh(m, m4(fit));
}

/** Все треугольники документа одной сеткой (координаты уже мировые): материал — номер в списке материалов. */
function toMesh(doc: Document): Mesh {
  const mats = doc.getRoot().listMaterials();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const mat: number[] = [];
  for (const prim of doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())) {
    if (prim.getMode() !== 4) continue;
    const p = prim.getAttribute('POSITION')!;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.getArray()!), 3));
    const ix = prim.getIndices();
    if (ix) geo.setIndex(new THREE.BufferAttribute(new Uint32Array(ix.getArray()!), 1));
    const n = prim.getAttribute('NORMAL');
    if (n) geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n.getArray()!), 3));
    else geo.computeVertexNormals();
    const t = prim.getAttribute('TEXCOORD_0');
    const base = pos.length / 3;
    const count = p.getCount();
    const gp = geo.getAttribute('position').array;
    const gn = geo.getAttribute('normal').array;
    for (let i = 0; i < count * 3; i++) {
      pos.push(gp[i]!);
      nor.push(gn[i]!);
    }
    const el = [0, 0];
    for (let i = 0; i < count; i++) {
      if (t) t.getElement(i, el);
      uv.push(el[0]!, el[1]!);
    }
    const idx = ix ? Array.from(ix.getArray()!) : Array.from({ length: count }, (_, i) => i);
    for (const i of idx) index.push(i + base);
    const m = Math.max(0, mats.indexOf(prim.getMaterial()!));
    for (let i = 0; i < idx.length / 3; i++) mat.push(m);
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), index: new Uint32Array(index), mat: new Uint8Array(mat) };
}

/* ---------- Черепок дня отдельно: смещение в файле черепков и вырезы текстуры ---------- */
/** Вырез текстуры черепка — не больше этого по длинной стороне: черепок на празднике крупно, но это не весь сосуд. */
const CROP_MAX = 512;
const CROP_PAD = 3;

async function shardsByDay(id: string, days: number, pieces: Piece[], doc: Document) {
  // Где черепок в общем файле: заголовок (u32 — число черепков), дальше черепки подряд.
  const sizes = pieces.map((p) => packPieces([p]).byteLength - 4);
  const offsets = sizes.map((_, i) => 4 + sizes.slice(0, i).reduce((a, b) => a + b, 0));
  const mats = doc.getRoot().listMaterials();
  const textures = [...new Set(mats.map((m) => m.getBaseColorTexture()).filter((t): t is Texture => Boolean(t)))];
  const images = new Map(
    await Promise.all(
      textures.map(async (t) => {
        const data = Buffer.from(t.getImage()!);
        const meta = await sharp(data).metadata();
        return [t, { data, w: meta.width!, h: meta.height! }] as const;
      }),
    ),
  );
  const order = findOrder(id, days);
  const files: { file: string; data: Promise<Buffer> }[] = [];
  // Вырез текстуры одного материала черепка: рамка развёртки по вершинам его треугольников.
  const crop = (day: number, p: Piece, material: number) => {
    const tex = mats[material]?.getBaseColorTexture();
    const img = tex && images.get(tex);
    if (!img) return [];
    let [u0, v0, u1, v1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let g = 0; g < p.groups.length; g += 3) {
      if (p.groups[g + 2] !== material) continue;
      for (let k = p.groups[g]!; k < p.groups[g]! + p.groups[g + 1]!; k++) {
        const vi = p.index[k]!;
        const u = p.uv[vi * 2]!;
        const w = p.uv[vi * 2 + 1]!;
        [u0, v0, u1, v1] = [Math.min(u0, u), Math.min(v0, w), Math.max(u1, u), Math.max(v1, w)];
      }
    }
    // Развёртка за пределами [0, 1] (повтор текстуры) — вырезом не передать: берём текстуру целиком.
    const wraps = u0 < -1e-3 || v0 < -1e-3 || u1 > 1 + 1e-3 || v1 > 1 + 1e-3;
    const x0 = wraps ? 0 : Math.max(0, Math.floor(u0 * img.w) - CROP_PAD);
    const y0 = wraps ? 0 : Math.max(0, Math.floor(v0 * img.h) - CROP_PAD);
    const x1 = wraps ? img.w : Math.min(img.w, Math.ceil(u1 * img.w) + CROP_PAD);
    const y1 = wraps ? img.h : Math.min(img.h, Math.ceil(v1 * img.h) + CROP_PAD);
    const k = Math.min(1, CROP_MAX / Math.max(x1 - x0, y1 - y0));
    const file = `${day}-${material}.webp`;
    files.push({
      file,
      data: sharp(img.data)
        .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
        .resize(Math.max(1, Math.round((x1 - x0) * k)), Math.max(1, Math.round((y1 - y0) * k)))
        .webp({ quality: 85 })
        .toBuffer(),
    });
    return [{ material, file, rect: [x0 / img.w, y0 / img.h, (x1 - x0) / img.w, (y1 - y0) / img.h] as [number, number, number, number] }];
  };
  const index: ShardIndex = {
    materials: mats.map((m) => {
      const [r, g, b] = m.getBaseColorFactor();
      return { color: [r, g, b], roughness: m.getRoughnessFactor(), metalness: m.getMetallicFactor(), map: Boolean(m.getBaseColorTexture()) };
    }),
    days: order.map((n, day) => {
      const p = pieces[n]!;
      const used = new Set<number>();
      for (let g = 2; g < p.groups.length; g += 3) used.add(p.groups[g]!);
      return { at: [offsets[n]!, sizes[n]!], crops: [...used].flatMap((m) => crop(day, p, m)) };
    }),
  };
  let cropBytes = 0;
  for (const [i, data] of (await Promise.all(files.map((f) => f.data))).entries()) {
    write(`${id}-${days}/${files[i]!.file}`, data);
    cropBytes += data.byteLength;
  }
  write(`${id}-${days}/index.json`, new TextEncoder().encode(JSON.stringify(index)));
  console.log(`  черепки по дням: вырезы ${Math.round(cropBytes / 1024)} КБ, в среднем ${Math.round(cropBytes / days / 1024)} КБ`);
}

/* ---------- Портрет: растеризация скана спереди (ортогонально), свет слева сверху ---------- */
const SS = 3;
async function pixelsOf(tex: Texture | null) {
  if (!tex) return undefined;
  const { data, info } = await sharp(Buffer.from(tex.getImage()!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function portrait(doc: Document): Promise<{ photo: Buffer; mask: Buffer; top: number }> {
  const W = PORTRAIT_W * SS;
  const H = PORTRAIT_H * SS;
  const color = new Float32Array(W * H * 3);
  const depth = new Float32Array(W * H).fill(-Infinity);
  const light = new THREE.Vector3(-0.45, 0.55, 0.7).normalize();
  const mats = await Promise.all(
    doc
      .getRoot()
      .listMaterials()
      .map(async (m) => ({ factor: m.getBaseColorFactor(), tex: await pixelsOf(m.getBaseColorTexture()) })),
  );
  let top = 0;
  const { pos, nor, uv, index, mat } = toMesh(doc);
  for (let i = 1; i < pos.length; i += 3) top = Math.max(top, pos[i]!);
  const sx = (x: number) => W / 2 + x * PX * SS;
  const sy = (y: number) => H - (y - FLOOR) * PX * SS;
  for (let t = 0; t < index.length; t += 3) {
    const vs = [index[t]!, index[t + 1]!, index[t + 2]!];
    const X = vs.map((v) => sx(pos[v * 3]!));
    const Y = vs.map((v) => sy(pos[v * 3 + 1]!));
    const Z = vs.map((v) => pos[v * 3 + 2]!);
    const area = (X[1]! - X[0]!) * (Y[2]! - Y[0]!) - (X[2]! - X[0]!) * (Y[1]! - Y[0]!);
    if (Math.abs(area) < 1e-9) continue;
    const m = mats[mat[t / 3]!]!;
    const x0 = Math.max(0, Math.floor(Math.min(...X)));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(...X)));
    const y0 = Math.max(0, Math.floor(Math.min(...Y)));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(...Y)));
    for (let py = y0; py <= y1; py++)
      for (let px = x0; px <= x1; px++) {
        const cx = px + 0.5;
        const cy = py + 0.5;
        const w0 = ((X[1]! - cx) * (Y[2]! - cy) - (X[2]! - cx) * (Y[1]! - cy)) / area;
        const w1 = ((X[2]! - cx) * (Y[0]! - cy) - (X[0]! - cx) * (Y[2]! - cy)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * Z[0]! + w1 * Z[1]! + w2 * Z[2]!;
        const o = py * W + px;
        if (z <= depth[o]!) continue;
        depth[o] = z;
        const w = [w0, w1, w2];
        const at = (arr: Float32Array, dim: number, k: number) => w.reduce((s, wi, j) => s + wi * arr[vs[j]! * dim + k]!, 0);
        const n = new THREE.Vector3(at(nor, 3, 0), at(nor, 3, 1), at(nor, 3, 2)).normalize();
        // Изнанка (смотрит от нас) — тёмная внутренность горла.
        const shade = n.z < 0 ? 0.35 : 0.42 + 0.75 * Math.max(0, n.dot(light));
        let rgb = [m.factor[0], m.factor[1], m.factor[2]];
        if (m.tex) {
          const u = ((at(uv, 2, 0) % 1) + 1) % 1;
          const v = ((at(uv, 2, 1) % 1) + 1) % 1;
          const ti = (Math.min(m.tex.h - 1, Math.floor(v * m.tex.h)) * m.tex.w + Math.min(m.tex.w - 1, Math.floor(u * m.tex.w))) * 4;
          rgb = rgb.map((c, k) => (c * m.tex!.data[ti + k]!) / 255);
        } else rgb = rgb.map((c) => Math.pow(c, 1 / 2.2));
        for (let k = 0; k < 3; k++) color[o * 3 + k] = Math.min(1, rgb[k]! * shade);
      }
  }
  // Сглаживание: SS × SS пикселей → один.
  const photo = Buffer.alloc(PORTRAIT_W * PORTRAIT_H * 4);
  const mask = Buffer.alloc(PORTRAIT_W * PORTRAIT_H * 4);
  for (let y = 0; y < PORTRAIT_H; y++)
    for (let x = 0; x < PORTRAIT_W; x++) {
      let a = 0;
      const sum = [0, 0, 0];
      for (let dy = 0; dy < SS; dy++)
        for (let dx = 0; dx < SS; dx++) {
          const o = (y * SS + dy) * W + x * SS + dx;
          if (depth[o] === -Infinity) continue;
          a++;
          for (let k = 0; k < 3; k++) sum[k]! += color[o * 3 + k]!;
        }
      const q = (y * PORTRAIT_W + x) * 4;
      for (let k = 0; k < 3; k++) photo[q + k] = a ? Math.round((sum[k]! / a) * 255) : 0;
      photo[q + 3] = mask[q + 3] = Math.round((a / (SS * SS)) * 255);
    }
  const raw = { raw: { width: PORTRAIT_W, height: PORTRAIT_H, channels: 4 as const } };
  return {
    photo: await sharp(photo, raw).webp({ quality: 88 }).toBuffer(),
    mask: await sharp(mask, raw).png().toBuffer(),
    top,
  };
}

const spans: Record<string, { bottom: number; top: number }> = {};
const frame = PORTRAIT_H / PX;
async function bake(v: (typeof VESSELS)[number]) {
  const t0 = performance.now();
  const tune = TUNE[v.id] ?? {};
  const doc = await io.read(path.join(SRC, `${v.id}.glb`));
  // Старый формат материалов (specular-glossiness) three.js не читает; «без света» — сосуд не жил бы в свете дворика.
  await doc.transform(metalRough());
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === KHRMaterialsUnlit.EXTENSION_NAME) ext.dispose();
  const before = triangles(doc);
  await normalize(doc, Number(process.env.YAW ?? tune.yaw ?? 0), tune.lid, tune.level);
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: tune.error ?? 0.0001, lockBorder: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92, resize: [2048, 2048] }),
  );
  // Черепки — по упрощённой копии (материалы в том же порядке, что у скана). Швы развёртки здесь не бережём:
  // черепок мелкий и недолго на виду, а без этого у сканов из миллионов треугольников копия не упрощается.
  const coarse = cloneDocument(doc);
  await coarse.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, SHARD_TRIS / triangles(coarse)), error: 0.02, lockBorder: false }));
  console.log(`  копия для черепков: ${Math.round(triangles(coarse) / 1000)}k`);
  const [y, m] = v.month.split('-').map(Number) as [number, number];
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pieces = cutMesh(v.id, toMesh(coarse), days);
  write(`${v.id}-${days}.bin`, packPieces(pieces));
  await shardsByDay(v.id, days, pieces, coarse);
  const pic = await portrait(doc);
  write(`${v.id}-photo.webp`, pic.photo);
  write(`${v.id}-mask.png`, pic.mask);
  spans[v.id] = { bottom: +(-FLOOR / frame).toFixed(4), top: +((pic.top - FLOOR) / frame).toFixed(4) };
  await doc.transform(draco({ quantizePosition: 16, quantizeTexcoord: 14, quantizeNormal: 12, quantizeColor: 10 }));
  write(`${v.id}.glb`, await io.writeBinary(doc));
  console.log(`${v.id}: ${Math.round(before / 1000)}k → ${Math.round(triangles(doc) / 1000)}k треугольников, черепков ${days}, ${Math.round(performance.now() - t0)} мс`);
}
// По одному сосуду: исходники по 100 МБ, вместе в память не влезут.
await VESSELS.filter((x) => !ONLY || x.id === ONLY).reduce((prev, v) => prev.then(() => bake(v)), Promise.resolve());

if (!ONLY)
  writeFileSync(
  path.join(ROOT, 'src/entities/vessel/data/baked.ts'),
  `// Сгенерировано \`pnpm museum:bake\` — не править руками.\n` +
    `/** Где сосуд в кадре портрета (\`<сосуд>-photo.webp\`): доли кадра снизу — низ и верх сосуда. */\n` +
    `export const PORTRAIT_SPAN: Readonly<Record<string, { bottom: number; top: number }>> = ${JSON.stringify(spans, null, 2)};\n`,
);
// Декодер Draco — рядом с сайтом, из той же версии three.js.
const DRACO = path.join(ROOT, 'public/draco');
mkdirSync(DRACO, { recursive: true });
for (const f of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) copyFileSync(path.join(ROOT, 'node_modules/three/examples/jsm/libs/draco/gltf', f), path.join(DRACO, f));
console.log(`public/museum: ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
