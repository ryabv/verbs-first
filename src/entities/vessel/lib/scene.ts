/**
 * 3D-музей ежедневных: сосуд на постаменте (целый, склеенный, черепки), печь, пока месяц идёт,
 * и миниатюры для полки. Модуль грузится лениво (import()) — three.js только там, где нужен.
 */
import * as THREE from 'three';
import { viewKey, type Vessel, type VesselView } from '../model/types';
import { BAY, courtyard, FLOOR_Y, isNight, makePlinth } from './courtyard';
import { cutVessel, handleCurve, paintSkin, prepare, rng, solidify, TAU, unpackPieces, type Handle, type Piece, type SkinPixels } from './bake';
import { SHAPES } from './shapes';
import { STYLES, TEX_H, TEX_W } from './paint';

/* ---------- Готовые роспись и черепки — из public/museum (pnpm museum:bake); нет файла — считаем здесь ---------- */
const cuts = new Map<string, Piece[]>();
const cutKey = (vessel: Vessel, count: number) => `${vessel.id}:${count}`;
const pending = new Map<string, Promise<void>>();
const MUSEUM = `${process.env.BASE_URL}museum/`;
/** Одна задача на ключ: повторные просьбы ждут ту же. */
function once(key: string, run: () => Promise<void>): Promise<void> {
  const hit = pending.get(key);
  if (hit) return hit;
  const p = run();
  pending.set(key, p);
  return p;
}
/** Дать странице отрисоваться между тяжёлыми шагами. */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/** Готов ли экспонат: роспись сосуда скачана и (для стола реставратора) черепки нарезаны. */
function isBaked(vessel: Vessel, count?: number): boolean {
  return skins.has(vessel.id) && (count === undefined || cuts.has(cutKey(vessel, count)));
}

/** Скачать роспись сосуда и, если нужно, нарезать черепки — дальше сцена строится без задержек. */
export function bakeVessel(vessel: Vessel, count?: number): Promise<void> {
  const skinJob = skins.has(vessel.id)
    ? Promise.resolve()
    : once(`skin:${vessel.id}`, async () => {
        const loader = new THREE.TextureLoader();
        try {
          const [map, roughness] = await Promise.all([loader.loadAsync(`${MUSEUM}${vessel.id}.webp`), loader.loadAsync(`${MUSEUM}${vessel.id}-rough.webp`)]);
          map.colorSpace = THREE.SRGBColorSpace;
          map.anisotropy = 8;
          skins.set(vessel.id, { map, roughness });
        } catch {
          // Файла нет (новый сосуд, не испекли) — рисуем здесь.
          await breathe();
          skin(vessel);
        }
      });
  if (count === undefined) return skinJob;
  const key = cutKey(vessel, count);
  const cutJob = cuts.has(key)
    ? Promise.resolve()
    : once(`cut:${key}`, async () => {
        try {
          // Черепки нарезаны заранее на число дней месяца сосуда; другое число (демо, перепривязка) — режем здесь.
          const res = await fetch(`${MUSEUM}${vessel.id}-${count}.bin`);
          if (!res.ok) throw new Error(String(res.status));
          cuts.set(key, unpackPieces(await res.arrayBuffer()));
        } catch {
          await breathe();
          if (!cuts.has(key)) cuts.set(key, cutVessel(vessel.id, vessel.shape, count));
        }
      });
  return Promise.all([skinJob, cutJob]).then(() => undefined);
}
const viewCount = (view: VesselView) => (view.kind === 'dig' ? view.total : undefined);

/* ---------- Текстуры сосуда ---------- */
interface Skin {
  map: THREE.Texture;
  roughness: THREE.Texture;
}
const skins = new Map<string, Skin>();
function skin(vessel: Vessel): Skin {
  const key = vessel.id;
  const hit = skins.get(key);
  if (hit) return hit;
  // Роспись не скачали заранее — рисуем здесь.
  return skinFrom(vessel.id, paintSkin(vessel.id, vessel.shape));
}

/** Холст с готовыми пикселями. */
function pixelCanvas(data: Uint8ClampedArray<ArrayBuffer>): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  c.getContext('2d')!.putImageData(new ImageData(data, TEX_W, TEX_H), 0, 0);
  return c;
}

/** Текстуры из пикселей, нарисованных на странице (когда готовой росписи нет). */
function skinFrom(id: string, px: SkinPixels): Skin {
  const map = new THREE.CanvasTexture(pixelCanvas(px.map));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const out = { map, roughness: new THREE.CanvasTexture(pixelCanvas(px.rough)) };
  skins.set(id, out);
  return out;
}

/* ---------- Сосуд ---------- */
/** Радиус наружной стороны профиля на высоте `y`. */
function handleGeometry(vessel: Vessel, h: Handle) {
  const curve = handleCurve(vessel.shape, h);
  return new THREE.TubeGeometry(curve, 48, SHAPES[vessel.shape].thick ?? 0.034, 12, false);
}

function materials(vessel: Vessel) {
  const style = STYLES[vessel.id]!;
  const { map, roughness } = skin(vessel);
  return {
    outer: new THREE.MeshStandardMaterial({ map, roughnessMap: roughness, roughness: 1, metalness: 0 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9, side: THREE.BackSide }),
    handle: new THREE.MeshStandardMaterial({ color: style.handle, roughness: style.glaze ? 0.25 : style.rough + 0.1 }),
    // Свежий скол — обожжённая глина изнутри черепка.
    rim: new THREE.MeshStandardMaterial({ color: 0xb9805a, roughness: 1, side: THREE.DoubleSide }),
  };
}

function buildVessel(vessel: Vessel): THREE.Group {
  const prep = prepare(vessel.shape);
  const mats = materials(vessel);
  const lathe = new THREE.LatheGeometry(prep.pts, 160, Math.PI, TAU);
  const body = new THREE.Group();
  body.add(new THREE.Mesh(lathe, mats.outer), new THREE.Mesh(lathe, mats.inner));
  for (const h of SHAPES[vessel.shape].handles) body.add(new THREE.Mesh(handleGeometry(vessel, h), mats.handle));
  body.scale.setScalar(prep.scale);
  body.traverse((o) => (o.castShadow = true));
  const group = new THREE.Group();
  group.add(body);
  return group;
}

/* ---------- Стол реставратора: найденные черепки ---------- */
/** Черепок: где он в собранном сосуде (`home`, поворот — нулевой) и где лежит в лотке. */
interface Shard {
  object: THREE.Group;
  home: THREE.Vector3;
  /** В лотке крупный черепок уменьшен, чтобы лечь в клетку; при сборке — настоящий размер. */
  tray: { p: THREE.Vector3; q: THREE.Quaternion; scale: number };
}

function shatter(vessel: Vessel, count: number): { object: THREE.Group; home: THREE.Vector3; outward: THREE.Vector3 }[] {
  const prep = prepare(vessel.shape);
  const mats = materials(vessel);
  const key = cutKey(vessel, count);
  // Не нарезали заранее — режем здесь.
  const data = cuts.get(key) ?? cutVessel(vessel.id, vessel.shape, count);
  cuts.set(key, data);
  const out = data.map((c) => {
    // Массивы общие с кэшем: геометрию не сдвигаем и не меняем — только объект.
    const { face, inner, rim } = solidify(c);
    const home = new THREE.Vector3(...c.home);
    const object = new THREE.Group();
    object.add(new THREE.Mesh(face, mats.outer), new THREE.Mesh(inner, mats.inner), new THREE.Mesh(rim, mats.rim));
    const outward = new THREE.Vector3(home.x, 0, home.z);
    // Донце и горлышко сверху — лежат «изнанкой» вниз; остальное — выпуклой стороной наружу.
    if (outward.lengthSq() < 0.04) outward.set(0, home.y < 0.3 ? -1 : 1, 0);
    else outward.normalize();
    return { object, home, outward };
  });
  // Ручки — к черепку, чей центр ближе всего к ручке.
  for (const h of SHAPES[vessel.shape].handles) {
    const hg = handleGeometry(vessel, h);
    hg.scale(prep.scale, prep.scale, prep.scale);
    hg.computeBoundingBox();
    const hc = hg.boundingBox!.getCenter(new THREE.Vector3());
    const owner = out.reduce((best, s) => (s.home.distanceTo(hc) < best.home.distanceTo(hc) ? s : best));
    hg.translate(-owner.home.x, -owner.home.y, -owner.home.z);
    owner.object.add(new THREE.Mesh(hg, mats.handle));
  }
  for (const s of out) s.object.traverse((o) => (o.castShadow = true));
  // Черепок дня — перемешанный порядок (одинаковый для сосуда): соседние дни — из разных мест сосуда.
  const rnd = rng(`${vessel.id}:finds`);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Дерево: доски с волокнами. */
let woodMap: THREE.Texture | undefined;
function wood(): THREE.Texture {
  if (woodMap) return woodMap;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const rnd = rng('wood');
  ctx.fillStyle = '#8a6141';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(${rnd() < 0.5 ? '60,38,22' : '170,130,90'},${0.15 + rnd() * 0.2})`;
    ctx.lineWidth = 0.5 + rnd() * 1.5;
    const y = rnd() * 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + (rnd() - 0.5) * 8, 170, y + (rnd() - 0.5) * 8, 256, y + (rnd() - 0.5) * 6);
    ctx.stroke();
  }
  // Стыки досок.
  ctx.fillStyle = 'rgba(40,25,15,0.5)';
  for (let y = 0; y < 256; y += 64) ctx.fillRect(0, y, 256, 2);
  woodMap = new THREE.CanvasTexture(c);
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
  return woodMap;
}

/** Песок в лотке. */
let sandMap: THREE.Texture | undefined;
function sand(): THREE.Texture {
  if (sandMap) return sandMap;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const rnd = rng('sand');
  ctx.fillStyle = '#cdb38a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '120,95,60' : '240,225,195'},${rnd() * 0.25})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  sandMap = new THREE.CanvasTexture(c);
  sandMap.colorSpace = THREE.SRGBColorSpace;
  sandMap.wrapS = sandMap.wrapT = THREE.RepeatWrapping;
  return sandMap;
}

/** Наклон лотка к зрителю — чтобы черепки было видно спереди. */
const TRAY_TILT = 1.05;

/**
 * Стол реставратора: на столе — наклонный лоток с песком, в нём найденные черепки (по одному за закрытый день).
 * Пустые места лотка ждут остальных. `stand` — стол с лотком (уходит в пол при сборке).
 */
function buildDig(vessel: Vessel, found: readonly number[], total: number): Built {
  const group = new THREE.Group();
  const stand = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: wood(), roughness: 0.85 });
  // Стол: столешница вровень с верхом постамента (y = 0), ножки до пола.
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 1.5), woodMat);
  top.position.y = -0.04;
  stand.add(top);
  for (const [x, z] of [[-1.5, -0.6], [1.5, -0.6], [-1.5, 0.6], [1.5, 0.6]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, -FLOOR_Y - 0.08, 0.09), woodMat);
    leg.position.set(x, (FLOOR_Y - 0.08) / 2, z);
    stand.add(leg);
  }
  // Лоток: дно с песком и бортики; лежит на подпорке, наклонён к зрителю.
  const cols = Math.ceil(Math.sqrt(total * 1.8));
  const rows = Math.ceil(total / cols);
  const cell = 0.34;
  const w = cols * cell + 0.2;
  const d = rows * cell + 0.2;
  const tray = new THREE.Group();
  const sandMat = new THREE.MeshStandardMaterial({ map: sand(), roughness: 1 });
  sandMat.map!.repeat.set(w / 1.2, d / 1.2);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), sandMat);
  bed.position.y = 0.02;
  tray.add(bed);
  for (const [bw, bd, x, z] of [[w + 0.08, 0.04, 0, -d / 2 - 0.02], [w + 0.08, 0.04, 0, d / 2 + 0.02], [0.04, d, -w / 2 - 0.02, 0], [0.04, d, w / 2 + 0.02, 0]] as const) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.1, bd), woodMat);
    rim.position.set(x, 0.05, z);
    tray.add(rim);
  }
  tray.rotation.x = TRAY_TILT;
  // Нижний (передний) край лотка — на столе, ближе к зрителю.
  tray.position.set(0, (d / 2) * Math.sin(TRAY_TILT) + 0.02, 0.15);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, (d / 2) * Math.sin(TRAY_TILT) * 2, 0.08), woodMat);
  prop.position.set(0, (d / 2) * Math.sin(TRAY_TILT), 0.15 - (d / 2) * Math.cos(TRAY_TILT) - 0.06);
  stand.add(tray, prop);
  stand.traverse((o) => (o.castShadow = o.receiveShadow = true));
  group.add(stand);

  // Черепки: каждый в своей клетке лотка, выпуклой стороной к зрителю, чуть повёрнут.
  stand.updateMatrixWorld(true);
  const rnd = rng(`${vessel.id}:tray`);
  const up = new THREE.Vector3(0, 1, 0);
  const all = shatter(vessel, total);
  const shards: Shard[] = found
    .filter((i) => i >= 0 && i < all.length)
    .map((i) => {
      // Клетка лотка — по дню: пропущенный день — пустое место.
      const s = all[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const spin = new THREE.Quaternion().setFromAxisAngle(up, (rnd() - 0.5) * 1.6);
      const lay = new THREE.Quaternion().setFromUnitVectors(s.outward, up);
      const q = spin.multiply(lay);
      // Размер после поворота: крупный черепок уменьшаем до клетки; снизу — чтобы лёг на песок.
      s.object.quaternion.copy(q);
      const box = new THREE.Box3().setFromObject(s.object);
      const size = box.getSize(new THREE.Vector3());
      const k = Math.min(1, (cell * 0.88) / Math.max(size.x, size.z, 0.01));
      s.object.scale.setScalar(k);
      const local = new THREE.Vector3(
        -w / 2 + 0.1 + (col + 0.5) * cell + (rnd() - 0.5) * 0.03,
        0.04 - box.min.y * k,
        -d / 2 + 0.1 + (row + 0.5) * cell + (rnd() - 0.5) * 0.03,
      );
      const p = local.applyMatrix4(tray.matrixWorld);
      const tq = tray.getWorldQuaternion(new THREE.Quaternion()).multiply(q);
      s.object.position.copy(p);
      s.object.quaternion.copy(tq);
      group.add(s.object);
      return { object: s.object, home: s.home, tray: { p: p.clone(), q: tq.clone(), scale: k } };
    });
  // Ненайденные черепки — только геометрия (материалы общие с найденными).
  all.forEach((s, i) => !found.includes(i) && s.object.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose()));
  return { object: group, shards, stand };
}

interface Built {
  object: THREE.Object3D;
  /** Стол реставратора: черепки и стол с лотком — для анимации сборки. */
  shards?: Shard[];
  stand?: THREE.Object3D;
}

function build(view: VesselView): Built {
  if (view.kind === 'dig') return buildDig(view.vessel, view.found, view.total);
  return { object: buildVessel(view.vessel) };
}

/* ---------- Свет и постамент ---------- */
function makeRenderer(canvas?: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !canvas });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

function dispose(o: THREE.Object3D) {
  o.traverse((x) => {
    if (x instanceof THREE.Mesh || x instanceof THREE.Points) {
      x.geometry.dispose();
      // Текстуры сосудов в кэше — материалы освобождаем, карты нет.
      for (const m of [x.material].flat() as THREE.Material[]) m.dispose();
    }
  });
}

/* ---------- Сцена на странице ---------- */
export interface VesselStage {
  /**
   * Экспонаты всех месяцев (по порядку) и тот, на который смотрим. Все стоят в одной галерее вдоль стены:
   * сменился `focus` — камера переходит к нему; `reveal` — номер экспоната, который только что собрали
   * (черепки слетаются из лотка в сосуд, стол уходит в пол, поднимается постамент).
   */
  update(exhibits: readonly VesselView[], focus: number, reveal?: { index: number; done?: () => void }): void;
  dispose(): void;
}

/** Место в галерее: постамент с сосудом или стол реставратора с черепками. */
interface Bay {
  key: string;
  kind: VesselView['kind'];
  group: THREE.Group;
  plinth?: THREE.Mesh;
  item: Built;
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function createVesselStage(host: HTMLElement): VesselStage {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const renderer = makeRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.append(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  const scene = new THREE.Scene();
  const yard = courtyard(scene);
  yard.setNight(isNight());
  // Тема сайта сменилась — во дворике день или вечер.
  const onTheme = () => {
    yard.setNight(isNight());
    invalidate();
  };
  const themeObserver = new MutationObserver(onTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener('change', onTheme);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.15, 8);
  // Камера неподвижна и смотрит спереди; перетаскиванием вбок крутится сам сосуд (поворотный столик).
  const target = new THREE.Vector3(0, 0.85, 0);
  camera.lookAt(target);
  const clock = new THREE.Clock();
  // Рисуем только когда что-то меняется: переход, сборка, вращение сосуда, тема, размер.
  // Карта теней пересчитывается тогда же — в покое тени застывают.
  renderer.shadowMap.autoUpdate = false;
  let dirty = true;
  let shadows = true;
  let prevT = 0;
  const invalidate = () => {
    dirty = true;
    shadows = true;
  };
  let disposed = false;
  // Поворотный столик: тянем вбок — сосуд вращается, отпустили — докручивается по инерции.
  let grab: { x: number; at: number } | undefined;
  let spinV = 0;
  const canvas = renderer.domElement;
  // Вертикальный свайп по витрине прокручивает страницу, горизонтальный — крутит сосуд.
  canvas.style.touchAction = 'pan-y';
  const onDown = (e: PointerEvent) => (grab = { x: e.clientX, at: performance.now() });
  const onMove = (e: PointerEvent) => {
    if (!grab) return;
    const now = performance.now();
    const turn = ((e.clientX - grab.x) / canvas.clientWidth) * Math.PI * 1.6;
    const bay = bays.get(focus);
    const ms = Math.max(1, now - grab.at);
    grab = { x: e.clientX, at: now };
    // Крутится только собранный сосуд; стол с черепками на перетаскивание не отвечает.
    if (bay?.kind !== 'vessel') return;
    bay.item.object.rotation.y += turn;
    spinV = turn / ms;
    invalidate();
  };
  const onUp = () => (grab = undefined);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  // Витрина за экраном — не рисуем вовсе.
  let visible = true;
  const seen = new IntersectionObserver(([e]) => {
    visible = e?.isIntersecting ?? true;
    if (visible) dirty = true;
  });
  seen.observe(host);

  /** Построенные места галереи: тот, на который смотрим, и соседи (их видно краем и по пути). */
  const bays = new Map<number, Bay>();
  let exhibits: readonly VesselView[] = [];
  let focus = -1;
  /** Переход камеры между экспонатами. */
  let travel: { from: number; to: number; start: number; dur: number; az: number; flat: number } | undefined;
  /** Сборка: черепки летят из лотка на свои места, стол уходит в пол, поднимается постамент. */
  let assembling: { index: number; bay: Bay; view: VesselView; plinth: THREE.Mesh; start: number; done?: () => void } | undefined;

  const dropBay = (bay: Bay) => {
    bay.item.object.parent?.remove(bay.item.object);
    dispose(bay.item.object);
    if (bay.plinth) dispose(bay.plinth);
    scene.remove(bay.group);
  };
  const makeBay = (i: number, view: VesselView): Bay => {
    const group = new THREE.Group();
    group.position.x = i * BAY;
    const item = build(view);
    group.add(item.object);
    // Сосуд — на постаменте; черепки — на столе реставратора.
    const plinth = view.kind === 'vessel' ? makePlinth() : undefined;
    if (plinth) group.add(plinth);
    scene.add(group);
    return { key: viewKey(view), kind: view.kind, group, plinth, item };
  };
  /** Достраивает места `focus ± 1`, остальные убирает. */
  const sync = (reveal?: { index: number; done?: () => void }) => {
    const want = new Set([focus - 1, focus, focus + 1].filter((i) => i >= 0 && i < exhibits.length));
    if (travel) for (let i = Math.min(travel.from, travel.to); i <= Math.max(travel.from, travel.to); i++) if (i >= 0 && i < exhibits.length) want.add(i);
    for (const [i, bay] of bays) {
      if (want.has(i) || assembling?.index === i) continue;
      dropBay(bay);
      bays.delete(i);
    }
    for (const i of want) {
      const view = exhibits[i]!;
      const bay = bays.get(i);
      if (bay?.key === viewKey(view) || assembling?.index === i) continue;
      // Роспись ещё качается или черепки режутся — достроим, когда будет готово (страница тем временем живая).
      if (!isBaked(view.vessel, viewCount(view))) {
        void bakeVessel(view.vessel, viewCount(view)).then(() => {
          if (disposed) return;
          sync(reveal);
          invalidate();
        });
        continue;
      }
      if (bay?.item.shards && view.kind === 'vessel' && reveal?.index === i && !still) {
        // Собрали: постамент ждёт под полом, пока черепки слетаются.
        const plinth = makePlinth();
        plinth.position.y = FLOOR_Y * 1.5 - 0.05;
        bay.group.add(plinth);
        assembling = { index: i, bay, view, plinth, start: clock.getElapsedTime(), done: reveal.done };
        continue;
      }
      if (bay) dropBay(bay);
      bays.set(i, makeBay(i, view));
      if (reveal?.index === i) reveal.done?.();
    }
  };

  /** Камера и всё, что за ней следует, — на `x` (смотрим на экспонат в этой точке). */
  const look = (x: number, cameraX: number) => {
    target.x = x;
    camera.position.x = cameraX;
    yard.follow(x);
  };
  const azimuth = () => Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
  const setAzimuth = (az: number) => {
    const off = camera.position.clone().sub(target);
    const flat = Math.hypot(off.x, off.z);
    camera.position.set(target.x + Math.sin(az) * flat, camera.position.y, target.z + Math.cos(az) * flat);
  };

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // На узком экране отодвигаем камеру — сосуд целиком.
    const off = camera.position.clone().sub(target);
    off.setLength(width < 600 || width / height < 0.9 ? 10 : 8);
    camera.position.copy(target).add(off);
    camera.updateProjectionMatrix();
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(0.1, t - prevT);
    prevT = t;
    const moving = Boolean(travel || assembling);
    if (travel) {
      // Идём вдоль стены; взгляд чуть опережает шаг — будто повернули голову к следующему сосуду.
      const k = Math.min(1, (t - travel.start) / travel.dur);
      const span = travel.to - travel.from;
      const head = travel.from + span * easeInOut(Math.min(1, k * 1.12));
      const feet = travel.from + span * easeInOut(k);
      // Камера возвращается к виду спереди: печь — топкой к зрителю, сосуд — с лица.
      const az = travel.az * (1 - easeInOut(k));
      look(head * BAY, feet * BAY + Math.sin(az) * travel.flat);
      camera.position.z = target.z + Math.cos(az) * travel.flat;
      if (k >= 1) {
        travel = undefined;
        look(focus * BAY, focus * BAY);
        sync();
      }
    }
    if (assembling) {
      const k = t - assembling.start;
      const { shards = [], stand } = assembling.bay.item;
      // Черепки по очереди поднимаются из лотка и по дуге встают на места; поворот — к нулевому.
      shards.forEach((sh, j) => {
        const e = easeInOut(Math.min(1, Math.max(0, (k - (j / Math.max(1, shards.length)) * 0.9) / 1.3)));
        const lift = sh.tray.p.clone().lerp(sh.home, 0.5).setY(Math.max(sh.tray.p.y, sh.home.y) + 0.8);
        const a = sh.tray.p.clone().lerp(lift, e);
        const b = lift.clone().lerp(sh.home, e);
        sh.object.position.copy(a.lerp(b, e));
        sh.object.quaternion.slerpQuaternions(sh.tray.q, new THREE.Quaternion(), e);
        sh.object.scale.setScalar(sh.tray.scale + (1 - sh.tray.scale) * e);
      });
      // Стол уходит в пол, на его место поднимается постамент.
      const down = Math.min(1, Math.max(0, (k - 0.7) / 0.9));
      if (stand) stand.position.y = -2.2 * down * down;
      const up = easeInOut(Math.min(1, Math.max(0, (k - 1.2) / 1.0)));
      assembling.plinth.position.y = FLOOR_Y * 1.5 - 0.05 + (-FLOOR_Y + 0.05) * up;
      if (k >= 2.5) {
        const { index, bay, view, done } = assembling;
        assembling = undefined;
        dropBay(bay);
        bays.set(index, makeBay(index, view));
        done?.();
      }
    }
    // Инерция столика: замедляется и останавливается.
    if (!grab && Math.abs(spinV) > 3e-5) {
      const bay = bays.get(focus);
      if (bay?.kind === 'vessel') bay.item.object.rotation.y += spinV * dt * 1000;
      spinV = still ? 0 : spinV * Math.pow(0.92, dt * 60);
      invalidate();
    }
    camera.lookAt(target);
    if (moving) invalidate();
    if (!dirty) return;
    // Камера ушла — тени те же: карта теней не зависит от камеры. Пересчёт — только когда двигались предметы.
    renderer.shadowMap.needsUpdate = shadows;
    renderer.render(scene, camera);
    dirty = false;
    shadows = false;
  });

  return {
    update(next, nextFocus, reveal) {
      exhibits = next;
      const to = Math.max(0, Math.min(next.length - 1, nextFocus));
      if (focus < 0 || still) {
        // Первый показ (или без анимаций) — сразу на месте, спереди.
        focus = to;
        travel = undefined;
        look(focus * BAY, focus * BAY);
        setAzimuth(0);
      } else if (to !== focus) {
        spinV = 0;
        // Через много месяцев — не пролетаем всю галерею: начинаем с соседнего места.
        const from = Math.abs(to - focus) > 1 ? to - Math.sign(to - focus) : focus;
        if (from !== focus) look(from * BAY, from * BAY);
        const off = camera.position.clone().sub(target);
        travel = { from, to, start: clock.getElapsedTime(), dur: 1.3, az: azimuth(), flat: Math.hypot(off.x, off.z) };
        focus = to;
      }
      sync(reveal);
      invalidate();
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      seen.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      themeObserver.disconnect();
      media?.removeEventListener('change', onTheme);
      if (assembling) dropBay(assembling.bay);
      for (const bay of bays.values()) if (bay !== assembling?.bay) dropBay(bay);
      scene.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/* ---------- Миниатюры для полки ---------- */
/** Свой маленький рендер для картинок черепков: без дворика и теней — шейдеров мало, готов быстро. */
let thumbRenderer: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | undefined;
const thumbs = new Map<string, string>();
function thumbStage() {
  if (thumbRenderer) return thumbRenderer;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(2);
  renderer.setSize(120, 150, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6b5a48, 1.4));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.2);
  sun.position.set(-2, 3, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 120 / 150, 0.1, 50);
  camera.position.set(0, 1.6, 6.4);
  camera.lookAt(0, 0.9, 0);
  thumbRenderer = { renderer, scene, camera };
  return thumbRenderer;
}

/** Картинка одного черепка (data URL, прозрачный фон): `index` — черепок дня (номер дня в месяце с нуля) из `total`. */
export function shardThumb(vessel: Vessel, index: number, total: number): string {
  const key = `shard:${vessel.id}:${index}/${total}`;
  const hit = thumbs.get(key);
  if (hit) return hit;
  const { renderer, scene, camera } = thumbStage();
  const all = shatter(vessel, total);
  const shard = all[Math.max(0, Math.min(all.length - 1, index))]!;
  // Выпуклой стороной к зрителю, чуть повёрнут; крупно — по центру кадра.
  const object = shard.object;
  object.quaternion.setFromUnitVectors(shard.outward, new THREE.Vector3(0.25, 0.15, 1).normalize());
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const k = 2.2 / Math.max(size.x, size.y, size.z, 0.01);
  object.scale.setScalar(k);
  const c = box.getCenter(new THREE.Vector3()).multiplyScalar(k);
  object.position.set(-c.x, 0.9 - c.y, -c.z);
  scene.add(object);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(object);
  for (const s of all) dispose(s.object);
  thumbs.set(key, url);
  return url;
}

/* ---------- Праздник: найден черепок ---------- */
/** Мягкое круглое сияние (для спрайтов). */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Кольцо-волна (вспышка в момент находки). */
function ringTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 80, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/**
 * Найденный черепок крупным планом: вылетает снизу, крутится и замедляется, вспыхивает волна, дальше парит
 * и покачивается в сиянии, вокруг кружит золотая пыль; черепок можно крутить рукой. Цвета сияния — из CSS (`--reveal-glow`, `--reveal-dust`).
 */
export function createShardReveal(host: HTMLElement, vessel: Vessel, index: number, total: number): { dispose(): void } {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const css = getComputedStyle(host);
  const glowColor = new THREE.Color(css.getPropertyValue('--reveal-glow').trim() || '#ffcf7a');
  const dustColor = new THREE.Color(css.getPropertyValue('--reveal-dust').trim() || '#ffd98f');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.append(renderer.domElement);
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  // Свет: тёплый сверху-спереди и два золотых контровых — край черепка светится.
  scene.add(new THREE.AmbientLight(0xfff0dc, 0.9));
  const key = new THREE.DirectionalLight(0xfff2de, 2.2);
  key.position.set(1.5, 2.5, 4);
  const rimL = new THREE.DirectionalLight(glowColor, 3);
  rimL.position.set(-3, 1, -2);
  const rimR = new THREE.DirectionalLight(glowColor, 2.5);
  rimR.position.set(3, -1, -2);
  scene.add(key, rimL, rimR);

  // Сияние за черепком и волна.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: glowColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.position.z = -1;
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), color: glowColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  ring.position.z = -0.5;
  scene.add(glow, ring);

  // Черепок: выпуклой стороной к зрителю, крупно.
  const all = shatter(vessel, total);
  const shard = all[Math.max(0, Math.min(all.length - 1, index))]!;
  const holder = new THREE.Group();
  const inner = shard.object;
  inner.quaternion.setFromUnitVectors(shard.outward, new THREE.Vector3(0, 0, 1));
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  const k = 2.1 / Math.max(size.x, size.y, 0.01);
  inner.scale.setScalar(k);
  inner.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-k));
  // Поворот рукой: тащим — крутится во все стороны, отпустили — докручивается по инерции.
  const turn = new THREE.Group();
  turn.add(inner);
  holder.add(turn);
  scene.add(holder);
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  let drag: { id: number; x: number; y: number; t: number } | undefined;
  const vel = { x: 0, y: 0 };
  const onDown = (e: PointerEvent) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    vel.x = vel.y = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  };
  const onMove = (e: PointerEvent) => {
    if (drag?.id !== e.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - drag.t);
    const dx = (e.clientX - drag.x) * 0.01;
    const dy = (e.clientY - drag.y) * 0.01;
    turn.rotation.y += dx;
    turn.rotation.x = Math.max(-1.3, Math.min(1.3, turn.rotation.x + dy));
    vel.y = dx / dt;
    vel.x = dy / dt;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now };
  };
  const onUp = (e: PointerEvent) => {
    if (drag?.id !== e.pointerId) return;
    drag = undefined;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  let last = performance.now();

  // Золотая пыль: частицы кружат вокруг, поднимаются и гаснут.
  const N = 260;
  const dustPos = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => ({ a: (i * 2.39996) % TAU, r: 1.2 + ((i * 7919) % 100) / 45, s: 0.25 + ((i * 104729) % 100) / 200, h: ((i * 31337) % 100) / 100 }));
  const dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dustPos, 3)),
    new THREE.PointsMaterial({ color: dustColor, size: 0.06, map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(dust);

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // На узком экране — отодвинуть, чтобы черепок с сиянием влезли.
    camera.position.z = width / height < 0.8 ? 8 : 6;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const clock = new THREE.Clock();
  const ARRIVE = 1.3;
  renderer.setAnimationLoop(() => {
    const t = still ? 10 : clock.getElapsedTime();
    const now = performance.now();
    const dt = Math.min(64, now - last);
    last = now;
    if (!drag && (Math.abs(vel.y) > 1e-5 || Math.abs(vel.x) > 1e-5)) {
      turn.rotation.y += vel.y * dt;
      turn.rotation.x = Math.max(-1.3, Math.min(1.3, turn.rotation.x + vel.x * dt));
      const damp = Math.pow(0.995, dt);
      vel.y *= damp;
      vel.x *= damp;
    }
    // Прилёт: снизу, с вращением, замедляясь.
    const a = Math.min(1, t / ARRIVE);
    const e = 1 - Math.pow(1 - a, 4);
    holder.position.y = -3.2 * (1 - e) + (a >= 1 ? Math.sin((t - ARRIVE) * 1.4) * 0.08 : 0);
    holder.rotation.y = (1 - e) * TAU * 1.5 + (a >= 1 ? Math.sin((t - ARRIVE) * 0.8) * 0.45 : 0);
    holder.rotation.x = (1 - e) * 0.6 + Math.sin(t * 0.6) * 0.06;
    holder.scale.setScalar(0.5 + 0.5 * e);
    // Сияние разгорается к прилёту и дышит.
    const pulse = 1 + Math.sin(t * 2.2) * 0.06;
    glow.scale.setScalar((2 + 3.6 * e) * pulse);
    glow.material.opacity = 0.35 + 0.5 * e;
    // Волна — один раз, в момент прилёта.
    const w = (t - ARRIVE * 0.85) / 1.1;
    ring.material.opacity = w > 0 && w < 1 ? (1 - w) * 0.9 : 0;
    ring.scale.setScalar(1 + Math.max(0, w) * 8);
    // Пыль: спирали вокруг, вверх; появляется вместе с черепком.
    for (let i = 0; i < N; i++) {
      const q = seeds[i]!;
      const life = (q.h + t * q.s * 0.35) % 1;
      const ang = q.a + t * q.s;
      const r = q.r * (0.6 + life * 0.6);
      dustPos[i * 3] = Math.cos(ang) * r;
      dustPos[i * 3 + 1] = -1.6 + life * 3.6;
      dustPos[i * 3 + 2] = Math.sin(ang) * r * 0.5 - 0.5;
    }
    dust.geometry.getAttribute('position').needsUpdate = true;
    dust.material.opacity = Math.min(1, t / ARRIVE) * 0.9;
    renderer.render(scene, camera);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      for (const s of all) dispose(s.object);
      scene.traverse((o) => {
        if (o instanceof THREE.Sprite || o instanceof THREE.Points) {
          o.geometry.dispose();
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
