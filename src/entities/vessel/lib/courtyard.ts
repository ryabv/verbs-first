/**
 * Средиземноморский дворик — фон витрины: белёная стена в штукатурке с охристым цоколем, пол из терракотовой плитки,
 * каменный куб под сосудом. Днём — солнце сквозь оливковые ветки (неподвижные тени листьев на стене), ночью — фонарь на стене.
 * Всё рисуется кодом (холсты), без картинок.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Уровень пола: на нём стоит печь; куб под сосудом — от пола до y = 0. */
export const FLOOR_Y = -0.6;
const WALL_Z = -2.4;
/** Расстояние между экспонатами месяцев: галерея вдоль стены, камера идёт от сосуда к сосуду. */
export const BAY = 5;
/** Стена и пол — куски конечной ширины: они идут за камерой и сдвигаются на целый период узора — шва не видно. */
const WALL_W = 60;
const WALL_PERIOD = 30;
const FLOOR_W = 60;
/** Плитка: 4×4 на текстуре, текстура — `FLOOR_REPEAT` раз на ширину пола. */
const FLOOR_REPEAT = 32;
const FLOOR_PERIOD = FLOOR_W / FLOOR_REPEAT;

function rng(seed: number) {
  let h = seed;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

/** Известковая штукатурка: неровные пятна побелки, мазки кисти; внизу — охристый цоколь. Высота стены — `wallH`. */
function plaster(wallH: number) {
  const [c, ctx] = canvas(1024, 512);
  const [b, bctx] = canvas(1024, 512);
  const rnd = rng(7);
  ctx.fillStyle = '#f2ebdf';
  ctx.fillRect(0, 0, 1024, 512);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 1024, 512);
  // Пятна: старая побелка проступает теплее, свежая — белее.
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 1024;
    const y = rnd() * 512;
    const r = 10 + rnd() * 60;
    const warm = rnd() < 0.5;
    // Пятно рисуется и со сдвигом на ширину холста — стена повторяется без шва.
    for (const sx of [x - 1024, x, x + 1024]) {
      const g = ctx.createRadialGradient(sx, y, 0, sx, y, r);
      g.addColorStop(0, warm ? 'rgba(214,196,168,0.22)' : 'rgba(255,255,252,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - r, y - r, r * 2, r * 2);
      const gb = bctx.createRadialGradient(sx, y, 0, sx, y, r);
      gb.addColorStop(0, warm ? 'rgba(60,60,60,0.25)' : 'rgba(200,200,200,0.25)');
      gb.addColorStop(1, 'rgba(0,0,0,0)');
      bctx.fillStyle = gb;
      bctx.fillRect(sx - r, y - r, r * 2, r * 2);
    }
  }
  // Мазки кисти — короткие дуги разной светлоты (только в рельефе).
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 1024;
    const y = rnd() * 512;
    bctx.strokeStyle = `rgba(${rnd() < 0.5 ? '60,60,60' : '200,200,200'},0.1)`;
    bctx.lineWidth = 1 + rnd() * 1.5;
    bctx.beginPath();
    const a0 = rnd() * 6;
    bctx.arc(x, y, 10 + rnd() * 16, a0, a0 + 0.5 + rnd() * 0.6);
    bctx.stroke();
  }
  // Цоколь: охра, неровный верхний край.
  const band = 512 * (0.55 / wallH);
  ctx.fillStyle = '#c98f55';
  ctx.beginPath();
  ctx.moveTo(0, 512);
  for (let x = 0; x <= 1024; x += 16) ctx.lineTo(x, 512 - band + (rnd() - 0.5) * 3);
  ctx.lineTo(1024, 512);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,70,30,0.18)';
  for (let i = 0; i < 120; i++) ctx.fillRect(rnd() * 1024, 512 - band * rnd(), 2 + rnd() * 10, 1 + rnd() * 3);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(b);
  for (const t of [map, bump]) {
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = WALL_W / WALL_PERIOD;
  }
  return { map, bump };
}

/** Терракотовая плитка 4×4 со швами, у каждой плитки свой оттенок и потёртости. */
function tiles() {
  const [c, ctx] = canvas(512, 512);
  const [b, bctx] = canvas(512, 512);
  const rnd = rng(11);
  ctx.fillStyle = '#9c7b5e';
  ctx.fillRect(0, 0, 512, 512);
  bctx.fillStyle = '#000';
  bctx.fillRect(0, 0, 512, 512);
  const s = 128;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const l = 44 + rnd() * 10;
      ctx.fillStyle = `hsl(${18 + rnd() * 8} ${34 + rnd() * 10}% ${l + 6}%)`;
      ctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      bctx.fillStyle = '#9a9a9a';
      bctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,230,200' : '90,40,20'},${0.05 + rnd() * 0.08})`;
        const r = 3 + rnd() * 14;
        ctx.beginPath();
        ctx.arc(i * s + 3 + rnd() * (s - 6), j * s + 3 + rnd() * (s - 6), r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(b);
  for (const t of [map, bump]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(FLOOR_REPEAT, 11);
    t.anisotropy = 8;
  }
  return { map, bump };
}

/** Известняк: светлый, с порами и прожилками. */
function stone() {
  const [c, ctx] = canvas(512, 512);
  const rnd = rng(23);
  ctx.fillStyle = '#ddd2bd';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '120,100,70' : '255,250,235'},${rnd() * 0.12})`;
    ctx.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  ctx.strokeStyle = 'rgba(150,130,100,0.18)';
  for (let i = 0; i < 6; i++) {
    ctx.lineWidth = 1 + rnd();
    ctx.beginPath();
    ctx.moveTo(0, rnd() * 512);
    ctx.bezierCurveTo(170, rnd() * 512, 340, rnd() * 512, 512, rnd() * 512);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** Трафарет солнца: оливковые ветки по краям — свет проходит между листьями; середина (сосуд) — открыта. */
function leafCookie() {
  const [raw, ctx] = canvas(1024, 1024);
  const rnd = rng(31);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 1024, 1024);
  // Тень листвы не чёрная: сквозь листья тоже немного света.
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  const branch = (x0: number, y0: number, angle: number, len: number, depth: number) => {
    let x = x0;
    let y = y0;
    let a = angle;
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      a += (rnd() - 0.5) * 0.25;
      const nx = x + Math.cos(a) * (len / steps);
      const ny = y + Math.sin(a) * (len / steps);
      ctx.lineWidth = Math.max(1.5, 5 * (1 - i / steps));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      // Листья оливы: длинные и узкие, парами вдоль ветки.
      for (const side of [-1, 1]) {
        if (rnd() < 0.3) continue;
        const la = a + side * (0.5 + rnd() * 0.4);
        const l = 14 + rnd() * 10;
        ctx.save();
        ctx.translate(nx + Math.cos(la) * l * 0.6, ny + Math.sin(la) * l * 0.6);
        ctx.rotate(la);
        ctx.beginPath();
        ctx.ellipse(0, 0, l, 2.6 + rnd() * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (depth > 0 && i % 5 === 3) branch(nx, ny, a + (rnd() < 0.5 ? -0.7 : 0.7), len * 0.45, depth - 1);
      x = nx;
      y = ny;
    }
  };
  // Ветки — сверху по краям: тени падают на верх стены, сосуд в середине — на солнце.
  branch(-10, 60, 0.25, 520, 2);
  branch(1034, 40, Math.PI - 0.22, 480, 2);
  branch(380, -10, 1.2, 200, 1);
  branch(-10, 420, -0.1, 220, 1);
  // Мягкие края теней.
  const [c, out] = canvas(1024, 1024);
  out.fillStyle = '#fff';
  out.fillRect(0, 0, 1024, 1024);
  out.filter = 'blur(4px)';
  out.drawImage(raw, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** Куб из известняка под сосудом: от пола до y = 0. У печи его нет — она стоит на полу. */
let stoneMap: THREE.Texture | undefined;
export function makePlinth(): THREE.Mesh {
  stoneMap ??= stone();
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(2.1, -FLOOR_Y, 1.7, 4, 0.05), new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 0.8 }));
  plinth.position.y = FLOOR_Y / 2;
  plinth.castShadow = plinth.receiveShadow = true;
  return plinth;
}

export interface Courtyard {
  /** Всё окружение — чтобы спрятать (силуэт в анонсе). */
  group: THREE.Group;
  setNight(night: boolean): void;
  /** Камера смотрит на `x`: стена, пол, солнце и фонари идут за ней. */
  follow(x: number): void;
}

/** Фонари — между экспонатами; светят ближайшие к камере, дальние гаснут плавно (без скачков при переходе). */
const LAMPS = 4;
const LAMP_POWER = 9;

export function courtyard(scene: THREE.Scene): Courtyard {
  const group = new THREE.Group();
  const wallH = 12;
  const wallTex = plaster(wallH);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_W, wallH),
    new THREE.MeshStandardMaterial({ map: wallTex.map, bumpMap: wallTex.bump, bumpScale: 0.7, roughness: 0.95 }),
  );
  wall.position.set(0, FLOOR_Y + wallH / 2, WALL_Z);
  wall.receiveShadow = true;

  const floorTex = tiles();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_W, 20),
    new THREE.MeshStandardMaterial({ map: floorTex.map, bumpMap: floorTex.bump, bumpScale: 2, roughness: 0.85 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y, WALL_Z + 10);
  floor.receiveShadow = true;
  group.add(wall, floor);

  // Фонари на стене: днём просто медные, ночью светят. Ставятся по мере надобности — между экспонатами.
  const lanternGlass = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffb45c, emissiveIntensity: 0, roughness: 0.3 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.5, metalness: 0.6 });
  const glassGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.32, 6);
  const capGeo = new THREE.ConeGeometry(0.17, 0.14, 6);
  const armGeo = new THREE.BoxGeometry(0.04, 0.04, 0.42);
  const lanterns = new Map<number, THREE.Object3D>();
  const lanternAt = (k: number) => {
    if (lanterns.has(k)) return;
    const lantern = new THREE.Group();
    const cap = new THREE.Mesh(capGeo, frame);
    cap.position.y = 0.23;
    const arm = new THREE.Mesh(armGeo, frame);
    arm.position.set(0, 0.3, -0.21);
    lantern.add(new THREE.Mesh(glassGeo, lanternGlass), cap, arm);
    lantern.position.set((k + 0.5) * BAY, 2.6, WALL_Z + 0.42);
    lanterns.set(k, lantern);
    group.add(lantern);
  };
  scene.add(group);

  // Свет. День: небо и солнце сквозь листья; ночь: рассеянный и фонари.
  const sky = new THREE.HemisphereLight(0xfff4e2, 0xa8754e, 1.5);
  const sun = new THREE.SpotLight(0xffe0b0, 2.8, 0, 0.5, 0.5, 0);
  sun.target.position.set(0.3, 0.9, WALL_Z + 0.6);
  sun.map = leafCookie();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 30;
  const lamps = Array.from({ length: LAMPS }, () => {
    const lamp = new THREE.PointLight(0xffb066, 0, 9, 1.6);
    scene.add(lamp);
    return lamp;
  });
  // Ночью сосуд подсвечен спереди тёплым мягким светом — иначе его не видно на фоне фонарей; он же даёт тень.
  const candle = new THREE.SpotLight(0xffc890, 0, 0, 0.35, 0.8, 0);
  candle.shadow.mapSize.set(1024, 1024);
  candle.shadow.bias = -0.0005;
  scene.add(sky, sun, sun.target, candle, candle.target);

  let night = false;
  let at = 0;
  const placeLamps = () => {
    // Четыре ближайших к камере места между экспонатами; яркость падает с расстоянием до нуля к краю набора.
    const c = at / BAY;
    const k0 = Math.round(c) - 2;
    lamps.forEach((lamp, i) => {
      const k = k0 + i;
      lanternAt(k);
      lamp.position.set((k + 0.5) * BAY, 2.45, WALL_Z + 0.75);
      const d = Math.abs(k + 0.5 - c);
      const w = Math.min(1, Math.max(0, 1 - (d - 0.5) / 1.5));
      lamp.intensity = night ? LAMP_POWER * w : 0;
    });
  };
  const yard: Courtyard = {
    group,
    setNight(n) {
      night = n;
      sky.color.set(n ? 0x8f8a9c : 0xfff4e2);
      sky.groundColor.set(n ? 0x24170f : 0xa8754e);
      sky.intensity = n ? 0.35 : 1.5;
      sun.intensity = n ? 0 : 2.8;
      sun.castShadow = !n;
      candle.intensity = n ? 1.6 : 0;
      candle.castShadow = n;
      lanternGlass.emissiveIntensity = n ? 2.2 : 0;
      placeLamps();
    },
    follow(x) {
      at = x;
      wall.position.x = Math.round(x / WALL_PERIOD) * WALL_PERIOD;
      floor.position.x = Math.round(x / FLOOR_PERIOD) * FLOOR_PERIOD;
      // Тени листьев неподвижны: сцена в покое не перерисовывается.
      sun.position.set(x - 5, 9, 6);
      sun.target.position.x = x + 0.3;
      candle.position.set(x + 1.5, 3.2, 7);
      candle.target.position.set(x, 0.9, 0);
      placeLamps();
    },
  };
  yard.follow(0);
  return yard;
}

/** Ночь — тёмная тема сайта (своя или системная). */
export function isNight(): boolean {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}
