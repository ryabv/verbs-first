/**
 * 3D-сцена острова на three.js — грузится отдельным чанком только на странице «История».
 *
 * Мир: x — вправо (как на карте), y — на север (y карты со знаком минус), z — высота.
 * Рельеф — сетка высот (terrain.ts); цвет земли считается в шейдере по высоте, уклону и маскам
 * (посёлок, поле, лес), поэтому берег, пляжи и прибой гладкие при любом приближении.
 * Камера перспективная: карту тащат, приближают колесом и щипком. Рендер — только при изменениях.
 */
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { MAP_H, MAP_W, noise, rng } from './island';
import { getTerrain, GRID_STEP, ROADS, SETTLEMENTS } from './terrain';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}
export interface IslandScene {
  /** Тропа по сюжету: пройденная часть и отрезок вперёд. */
  update(route: { done: [number, number][]; ahead: [number, number][] }): void;
  /**
   * Плавно навести камеру на точку карты. at — где на холсте должна оказаться точка (пиксели):
   * например, в свободной от карточки части; без него — в центре.
   */
  focus(x: number, y: number, at?: { x: number; y: number }): void;
  /** Вызывается после каждого кадра: перевод точки карты в пиксели холста. */
  onFrame(cb: (project: (x: number, y: number) => ScreenPoint) => void): void;
  dispose(): void;
}

const MIN_DIST = 120;
const FOV = 32;
/** Где можно держать центр камеры (координаты карты). */
// Снизу — с запасом: на телефоне место у южного берега поднимается над карточкой.
const BOUNDS = { x0: 80, x1: 920, y0: 80, y1: 760 };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const noop = () => {};

/** Цвета земли — переменные --map-* (одни для обеих тем, как у фотографии). */
const PALETTE = [
  'deep', 'sea', 'shallow', 'lagoon', 'foam', 'sand', 'dry', 'grass', 'forest', 'rock', 'peak', 'town',
  'wheat', 'field2', 'field3', 'plow', 'hedge',
] as const;
const uniformName = (name: string) => `u${name[0]!.toUpperCase()}${name.slice(1)}`;

const GLSL_NOISE = /* glsl */ `
  float vfHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vfNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(vfHash(i), vfHash(i + vec2(1.0, 0.0)), f.x), mix(vfHash(i + vec2(0.0, 1.0)), vfHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float vfFbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * vfNoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

/** Цвет земли: вода по глубине, песок, кустарник, поля лоскутами, лес, посёлки, скалы, прибой. */
const GLSL_COLOR = /* glsl */ `
  vec2 p = vec2(vPos.x, -vPos.y);
  float h = vPos.z;
  float slope = 1.0 - normalize(vN).z;
  float n1 = vfFbm(p / 14.0);
  vec3 col;
  if (h < 0.0) {
    float d = clamp(-h / 30.0, 0.0, 1.0);
    col = mix(uLagoon, uShallow, smoothstep(0.0, 0.12, d));
    col = mix(col, uSea, smoothstep(0.18, 0.55, d));
    col = mix(col, uDeep, smoothstep(0.55, 1.0, d));
  } else {
    col = mix(uDry, uGrass, smoothstep(0.32, 0.68, vfFbm(p / 55.0 + 7.0)));
    col *= 0.86 + 0.28 * n1;
    float fm = smoothstep(0.35, 0.65, vMask.y);
    if (fm > 0.0) {
      vec2 region = floor(p / 110.0);
      float ang = vfHash(region) * 1.4 - 0.7;
      mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
      vec2 q = (R * p) / vec2(13.0, 8.0);
      vec2 cell = floor(q);
      float r = vfHash(cell + region * 7.0);
      vec3 fc = r < 0.3 ? uWheat : r < 0.55 ? uField2 : r < 0.8 ? uField3 : uPlow;
      fc *= 0.9 + 0.2 * vfHash(cell + 3.1);
      vec2 fq = fract(q);
      float edge = min(min(fq.x, 1.0 - fq.x) * 13.0, min(fq.y, 1.0 - fq.y) * 8.0);
      fc = mix(uHedge, fc, smoothstep(0.12, 0.4, edge) * 0.75 + 0.25);
      col = mix(col, fc, fm);
    }
    col = mix(col, uForest * (0.8 + 0.4 * n1), smoothstep(0.35, 0.7, vMask.z));
    col = mix(col, uTown * (0.92 + 0.16 * n1), smoothstep(0.3, 0.75, vMask.x) * 0.9);
    float rock = max(smoothstep(0.3, 0.55, slope + (n1 - 0.5) * 0.15), smoothstep(60.0, 95.0, h + n1 * 24.0));
    col = mix(col, uRock * (0.8 + 0.4 * n1), rock);
    col = mix(col, uPeak, smoothstep(100.0, 125.0, h + n1 * 18.0));
    float beach = 1.0 - smoothstep(0.7, 2.0 + n1 * 2.0, h);
    col = mix(col, uSand * (0.94 + 0.12 * n1), beach * (1.0 - smoothstep(0.2, 0.45, slope)));
  }
  float foam = smoothstep(-0.7, -0.1, h) * (1.0 - smoothstep(0.0, 0.35, h));
  col = mix(col, uFoam, foam * (0.5 + 0.5 * vfNoise(p * 0.6)));
  diffuseColor.rgb = col;
`;

/** Карта нормалей ряби: сумма синусов с целыми частотами — бесшовно повторяется. */
function waveNormals(): THREE.Texture {
  const N = 128;
  const waves = [
    [3, 1, 0.5, 0.3],
    [-2, 4, 0.35, 1.7],
    [5, -3, 0.2, 4.1],
    [1, 7, 0.15, 2.2],
    [-8, 3, 0.1, 5.3],
    [6, 5, 0.12, 0.9],
    [-4, -6, 0.18, 3.3],
    [9, -1, 0.08, 1.1],
  ] as const;
  const h = (u: number, v: number) => waves.reduce((s, [fx, fy, a, p]) => s + a * Math.sin(2 * Math.PI * (fx * u + fy * v) + p), 0);
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const e = 1 / N;
      const dx = (h((i + 1) * e, j * e) - h((i - 1) * e, j * e)) * 2.2;
      const dy = (h(i * e, (j + 1) * e) - h(i * e, (j - 1) * e)) * 2.2;
      const len = Math.hypot(dx, dy, 1);
      const k = (j * N + i) * 4;
      data[k] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[k + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      data[k + 2] = (1 / len) * 0.5 * 255 + 127;
      data[k + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, N, N);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(260, 260);
  t.needsUpdate = true;
  return t;
}

/** Надпись, лежащая на карте (как названия на картах стратегий). */
async function labelMesh(text: string, color: string, size: number, spacing: number, outline?: string): Promise<THREE.Mesh> {
  const font = `italic 700 ${size}px Alegreya, Georgia, serif`;
  try {
    await document.fonts.load(font, text);
  } catch {
    /* шрифт не загрузился — рисуем запасным */
  }
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = font;
  const chars = [...text];
  const width = chars.reduce((s, ch) => s + g.measureText(ch).width, 0) + spacing * (chars.length - 1);
  c.width = Math.ceil(width + 40);
  c.height = Math.ceil(size * 1.6);
  g.font = font;
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = size / 9;
  let x = 20;
  for (const ch of chars) {
    if (outline) {
      g.strokeStyle = outline;
      g.strokeText(ch, x, c.height / 2);
    }
    g.fillText(ch, x, c.height / 2);
    x += g.measureText(ch).width + spacing;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(c.width / 4, c.height / 4), mat);
  mesh.renderOrder = 5;
  return mesh;
}

/** Линия, лежащая на рельефе: отрезки дробятся, чтобы не уходить под землю. */
function drape(pts: readonly [number, number][], lift: number): number[] {
  const terrain = getTerrain();
  const out: number[] = [];
  pts.forEach(([x, y], i) => {
    const [px, py] = i ? pts[i - 1]! : [x, y];
    const n = i ? Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / 2)) : 0;
    for (let k = i ? 1 : 0; k <= n; k++) {
      const t = n ? k / n : 1;
      const qx = px + (x - px) * t;
      const qy = py + (y - py) * t;
      out.push(qx, -qy, Math.max(0, terrain.heightAt(qx, qy)) + lift);
    }
  });
  return out;
}

export function createIslandScene(host: HTMLElement, start: { x: number; y: number }): IslandScene {
  let disposed = false;
  const terrain = getTerrain();
  const css = getComputedStyle(document.documentElement);
  const cssColor = (name: string) => css.getPropertyValue(name).trim();
  const color = (name: string) => new THREE.Color(cssColor(name));
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  // ---------- рельеф ----------
  const cols = terrain.cols;
  const rows = terrain.rows;
  const count = (cols + 1) * (rows + 1);
  const positions = new Float32Array(count * 3);
  const masks = new Float32Array(count * 3);
  for (let j = 0, k = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++, k++) {
      positions[k * 3] = i * GRID_STEP;
      positions[k * 3 + 1] = -j * GRID_STEP;
      positions[k * 3 + 2] = terrain.heights[k]!;
      masks[k * 3] = terrain.town[k]!;
      masks[k * 3 + 1] = terrain.field[k]!;
      masks[k * 3 + 2] = terrain.forest[k]!;
    }
  }
  const index = new Uint32Array(cols * rows * 6);
  for (let j = 0, n = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const c = a + cols + 1;
      index.set([a, c, a + 1, a + 1, c, c + 1], n);
      n += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aMask', new THREE.BufferAttribute(masks, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  groundMat.onBeforeCompile = (shader) => {
    for (const name of PALETTE) shader.uniforms[uniformName(name)] = { value: color(`--map-${name}`) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aMask;\nvarying vec3 vMask;\nvarying vec3 vPos;\nvarying vec3 vN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = aMask;\nvPos = position;\nvN = normal;');
    const uniforms = PALETTE.map((name) => `uniform vec3 ${uniformName(name)};`).join('\n');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${uniforms}\nvarying vec3 vMask;\nvarying vec3 vPos;\nvarying vec3 vN;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${GLSL_COLOR}`);
  };

  const scene = new THREE.Scene();
  const deep = color('--map-deep');
  scene.background = deep;
  scene.fog = new THREE.Fog(deep, 800, 2600);

  const ground = new THREE.Mesh(geometry, groundMat);
  ground.castShadow = true;
  ground.receiveShadow = true;
  scene.add(ground);

  // Дно за краем карты и вода поверх: рябь ловит блики солнца.
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ color: deep, roughness: 1 }));
  seabed.position.set(MAP_W / 2, -MAP_H / 2, -37);
  scene.add(seabed);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(8000, 8000),
    new THREE.MeshStandardMaterial({
      color: color('--map-sea'),
      transparent: true,
      opacity: 0.42,
      roughness: 0.4,
      metalness: 0,
      normalMap: waveNormals(),
      normalScale: new THREE.Vector2(0.08, 0.08),
      depthWrite: false,
    }),
  );
  water.position.set(MAP_W / 2, -MAP_H / 2, 0);
  water.receiveShadow = true;
  scene.add(water);

  // ---------- посёлки ----------
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 0, 1);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const tint = new THREE.Color();
  const slopeAt = (x: number, y: number) =>
    Math.hypot(terrain.heightAt(x + 1.5, y) - terrain.heightAt(x - 1.5, y), terrain.heightAt(x, y + 1.5) - terrain.heightAt(x, y - 1.5)) / 3;

  const rand = rng(7);
  const houses: { x: number; y: number; w: number; d: number; h: number; rot: number; alt: boolean }[] = [];
  const churches: { x: number; y: number; rot: number }[] = [];
  for (const s of SETTLEMENTS) {
    // Кварталы по повёрнутой сетке; часть линий — улицы.
    const rot = rand() * Math.PI;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const cell = 4.2;
    const span = Math.ceil((s.r * 1.6) / cell);
    let placed = 0;
    for (let a = -span; a <= span && placed < s.n; a++) {
      for (let b = -span; b <= span && placed < s.n; b++) {
        if (a % 3 === 0 || b % 4 === 0) continue;
        const lx = a * cell + (rand() - 0.5) * 1.2;
        const ly = b * cell + (rand() - 0.5) * 1.2;
        const d = Math.hypot(lx, ly) / s.r;
        if (rand() > Math.exp(-d * d * 1.3)) continue;
        const x = s.x + lx * cos - ly * sin;
        const y = s.y + lx * sin + ly * cos;
        if (terrain.heightAt(x, y) < 0.8 || slopeAt(x, y) > 0.9) continue;
        houses.push({ x, y, w: 2.4 + rand() * 1.4, d: 2.2 + rand() * 1.2, h: 1.6 + rand() * 1.4, rot: rot + (rand() - 0.5) * 0.15, alt: rand() < 0.28 });
        placed++;
      }
    }
    if (s.n >= 30) churches.push({ x: s.x + (rand() - 0.5) * s.r * 0.3, y: s.y + (rand() - 0.5) * s.r * 0.3, rot });
  }
  const houseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75 }), houses.length);
  const roof = color('--map-roof');
  const roofAlt = color('--map-roof-alt');
  houses.forEach((hs, i) => {
    q.setFromAxisAngle(up, hs.rot);
    pos.set(hs.x, -hs.y, terrain.heightAt(hs.x, hs.y) + hs.h / 2);
    scl.set(hs.w, hs.d, hs.h);
    houseMesh.setMatrixAt(i, m.compose(pos, q, scl));
    houseMesh.setColorAt(i, tint.copy(hs.alt ? roofAlt : roof).multiplyScalar(0.92 + noise(hs.x, hs.y) * 0.16));
  });
  houseMesh.castShadow = true;
  houseMesh.receiveShadow = true;
  scene.add(houseMesh);

  // Церкви: белый объём и синий купол.
  const churchBody = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 7, 4), new THREE.MeshStandardMaterial({ color: roof, roughness: 0.7 }), churches.length);
  const domes = new THREE.InstancedMesh(
    new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: color('--map-dome'), roughness: 0.45 }),
    churches.length,
  );
  churches.forEach((c, i) => {
    const z = terrain.heightAt(c.x, c.y);
    q.setFromAxisAngle(up, c.rot);
    churchBody.setMatrixAt(i, m.compose(pos.set(c.x, -c.y, z + 2), q, scl.set(1, 1, 1)));
    domes.setMatrixAt(i, m.compose(pos.set(c.x, -c.y, z + 4), q, scl.set(1, 1, 1)));
  });
  churchBody.castShadow = true;
  domes.castShadow = true;
  scene.add(churchBody, domes);

  // ---------- деревья ----------
  const treeRand = rng(31);
  const pines: [number, number, number][] = [];
  const broad: [number, number, number][] = [];
  const stepT = small ? 3.2 : 2.6;
  for (let y = 60; y < 600; y += stepT) {
    for (let x = 100; x < 920; x += stepT) {
      const tx = x + (treeRand() - 0.5) * stepT;
      const ty = y + (treeRand() - 0.5) * stepT;
      const h = terrain.heightAt(tx, ty);
      if (h < 1.5 || h > 95) continue;
      const mk = terrain.maskAt(tx, ty);
      // Лес густо, по кустарнику — редкие деревья, на полях и в посёлках — ни одного.
      const chance = mk.forest > 0.4 ? 0.85 * mk.forest : mk.field > 0.3 || mk.town > 0.25 ? 0 : 0.035;
      if (treeRand() > chance) continue;
      const size = 1 + treeRand() * 0.9;
      (h > 35 || treeRand() < 0.3 ? pines : broad).push([tx, ty, size]);
    }
  }
  // Оливковая роща — ровные ряды.
  for (let a = -10; a <= 10; a++) {
    for (let b = -7; b <= 7; b++) {
      const x = 205 + a * 4.6 + b * 1.2;
      const y = 385 + b * 4.6 - a * 1.2;
      if (Math.hypot(x - 205, y - 385) < 46 && terrain.heightAt(x, y) > 1.5) broad.push([x, y, 0.85 + treeRand() * 0.3]);
    }
  }
  // Дерево = ствол + крона на нём: тень начинается от земли, кроны не «висят».
  const treeColor = color('--map-tree');
  const all = [...pines.map((t) => [...t, 0.7] as const), ...broad.map((t) => [...t, 1.3] as const)];
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.16, 0.26, 1, 5).rotateX(Math.PI / 2).translate(0, 0, 0.5),
    new THREE.MeshStandardMaterial({ color: color('--map-trunk'), roughness: 1 }),
    all.length,
  );
  q.identity();
  all.forEach(([x, y, size, k], i) => {
    // Основание чуть в земле — на склоне ствол не отрывается.
    trunks.setMatrixAt(i, m.compose(pos.set(x, -y, terrain.heightAt(x, y) - 0.3), q, scl.set(size, size, size * k + 0.4)));
  });
  trunks.castShadow = true;
  scene.add(trunks);

  /** Кроны: center — высота центра кроны над землёй в долях размера, squash — приплюснутость. */
  const crowns = (geo: THREE.BufferGeometry, list: [number, number, number][], center: number, squash: number) => {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), list.length);
    list.forEach(([x, y, s], i) => {
      q.setFromAxisAngle(up, noise(x * 3, y * 3) * 6);
      mesh.setMatrixAt(i, m.compose(pos.set(x, -y, terrain.heightAt(x, y) + s * center), q, scl.set(s, s, s * squash)));
      mesh.setColorAt(i, tint.copy(treeColor).multiplyScalar(0.75 + noise(x * 0.7, y * 0.7) * 0.5));
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  // Хвойные: конус высотой 3.4 начинается на высоте ствола (0.7).
  crowns(new THREE.ConeGeometry(1, 3.4, 6).rotateX(Math.PI / 2), pines, 0.6 + 1.7, 1);
  // Лиственные: шар чуть приплюснут, нижний край — на верхушке ствола (1.3).
  crowns(new THREE.IcosahedronGeometry(1.1, 1), broad, 1.2 + 1.1 * 0.82, 0.82);

  // ---------- свет ----------
  scene.add(new THREE.HemisphereLight(color('--map-light'), color('--map-dry'), 1.15));
  const sun = new THREE.DirectionalLight(color('--map-light'), 2.4);
  sun.position.set(MAP_W / 2 - 420, -MAP_H / 2 + 360, 480);
  sun.target.position.set(MAP_W / 2, -MAP_H / 2, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 2048 : 4096, small ? 2048 : 4096);
  Object.assign(sun.shadow.camera, { left: -620, right: 620, top: 620, bottom: -620, near: 1, far: 2000 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.25;
  scene.add(sun, sun.target);

  // ---------- дороги, тропа, надписи ----------
  const lineMaterials: LineMaterial[] = [];
  const addLine = (group: THREE.Group, pts: readonly [number, number][], opts: { color: string; width: number; dashed?: boolean; opacity?: number; lift?: number }) => {
    const g = new LineGeometry();
    g.setPositions(drape(pts, opts.lift ?? 1.4));
    const mat = new LineMaterial({
      color: color(opts.color).getHex(),
      linewidth: opts.width,
      dashed: opts.dashed ?? false,
      dashSize: 5,
      gapSize: 5,
      transparent: true,
      opacity: opts.opacity ?? 1,
    });
    mat.resolution.set(host.clientWidth, host.clientHeight);
    lineMaterials.push(mat);
    const line = new Line2(g, mat);
    line.computeLineDistances();
    line.renderOrder = 4;
    group.add(line);
  };
  const roads = new THREE.Group();
  for (const r of ROADS) addLine(roads, r, { color: '--map-road', width: 1.3, opacity: 0.6, lift: 0.6 });
  scene.add(roads);
  const routeGroup = new THREE.Group();
  scene.add(routeGroup);

  void Promise.all([
    labelMesh('Анемуса', cssColor('--map-roof'), 150, 34, cssColor('--map-label')).then((mesh) => {
      mesh.position.set(560, -300, 110);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
      return mesh;
    }),
    labelMesh('Эгейское море', cssColor('--map-sea-label'), 84, 18).then((mesh) => {
      mesh.position.set(820, -50, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
      return mesh;
    }),
  ]).then((meshes) => {
    if (disposed) return;
    scene.add(...meshes);
    invalidate();
  });

  const update: IslandScene['update'] = (route) => {
    for (const l of routeGroup.children) (l as Line2).geometry.dispose();
    routeGroup.clear();
    if (route.done.length > 1) addLine(routeGroup, route.done, { color: '--brand', width: 4.5, lift: 2 });
    if (route.ahead.length > 1) addLine(routeGroup, route.ahead, { color: '--map-ui', width: 3, dashed: true, opacity: 0.95, lift: 2 });
    invalidate();
  };

  // ---------- камера ----------
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);
  camera.up.set(0, 0, 1);
  const view = { x: start.x, y: start.y, dist: 300 };
  let maxDist = 900;
  /** Стартовое приближение: в кадре ~200 единиц карты по ширине и ~200 по высоте. */
  let closeDist = 350;

  const placeCamera = () => {
    view.x = clamp(view.x, BOUNDS.x0, BOUNDS.x1);
    view.y = clamp(view.y, BOUNDS.y0, BOUNDS.y1);
    view.dist = clamp(view.dist, MIN_DIST, maxDist);
    // Чем ближе, тем сильнее наклон: издалека — почти сверху, вблизи — горы в перспективе.
    const t = clamp01((view.dist - MIN_DIST) / (maxDist - MIN_DIST));
    const pitch = 1.0 - 0.55 * t;
    camera.position.set(view.x, -view.y - view.dist * Math.sin(pitch), view.dist * Math.cos(pitch));
    camera.lookAt(view.x, -view.y, 0);
    const fog = scene.fog as THREE.Fog;
    fog.near = view.dist * 1.4;
    fog.far = view.dist * 3.4;
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  host.prepend(renderer.domElement);

  let frameCb: (project: (x: number, y: number) => ScreenPoint) => void = noop;
  const v = new THREE.Vector3();
  const project = (x: number, y: number): ScreenPoint => {
    v.set(x, -y, Math.max(0, terrain.heightAt(x, y))).project(camera);
    return {
      x: ((v.x + 1) / 2) * host.clientWidth,
      y: ((1 - v.y) / 2) * host.clientHeight,
      visible: v.z < 1 && Math.abs(v.x) < 1.3 && Math.abs(v.y) < 1.3,
    };
  };

  let raf = 0;
  let tween: { from: typeof view; to: typeof view; start: number } | undefined;
  const frame = (now: number) => {
    raf = 0;
    if (tween) {
      const t = clamp01((now - tween.start) / 650);
      const e = 1 - (1 - t) ** 3;
      view.x = tween.from.x + (tween.to.x - tween.from.x) * e;
      view.y = tween.from.y + (tween.to.y - tween.from.y) * e;
      view.dist = tween.from.dist + (tween.to.dist - tween.from.dist) * e;
      if (t < 1) invalidate();
      else tween = undefined;
    }
    placeCamera();
    renderer.render(scene, camera);
    frameCb(project);
  };
  function invalidate() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }

  let started = false;
  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    for (const mat of lineMaterials) mat.resolution.set(w, h);
    // Самое дальнее — весь остров в кадре.
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    maxDist = clamp(Math.max(440 / (tan * camera.aspect), 300 / tan), 500, 2600);
    closeDist = clamp(Math.max(105 / (tan * camera.aspect), 100 / tan), MIN_DIST * 1.4, maxDist * 0.6);
    if (!started) {
      // Старт — приближенно, у места, где сейчас Анна; отдалить можно колесом или кнопкой.
      started = true;
      view.dist = closeDist;
    }
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  // ---------- управление ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  /** Точка карты под пикселем холста (на уровне моря). */
  const groundAt = (px: number, py: number) => {
    placeCamera();
    camera.updateMatrixWorld();
    ndc.set((px / host.clientWidth) * 2 - 1, -(py / host.clientHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const { origin, direction } = raycaster.ray;
    if (direction.z >= -1e-4) return undefined;
    const t = -origin.z / direction.z;
    return { x: origin.x + direction.x * t, y: -(origin.y + direction.y * t) };
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  /** Приблизить, держа точку под курсором на месте. */
  const zoomAt = (factor: number, px: number, py: number) => {
    tween = undefined;
    const before = groundAt(px, py);
    view.dist = clamp(view.dist * factor, MIN_DIST, maxDist);
    const after = groundAt(px, py);
    if (before && after) {
      view.x += before.x - after.x;
      view.y += before.y - after.y;
    }
    invalidate();
  };

  type Pt = { x: number; y: number };
  const pointers = new Map<number, Pt>();
  let grab: Pt | undefined;
  let pinch = 0;
  let moved = 0;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    moved = 0;
    tween = undefined;
    if (pointers.size === 1) grab = groundAt(p.x, p.y);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [Pt, Pt];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    const prev = pointers.get(e.pointerId)!;
    moved += Math.hypot(p.x - prev.x, p.y - prev.y);
    pointers.set(e.pointerId, p);
    if (moved > 4 && !host.hasPointerCapture(e.pointerId)) {
      host.setPointerCapture(e.pointerId);
      host.dataset.dragging = '';
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [Pt, Pt];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0 && d > 0) zoomAt(pinch / d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = d;
      return;
    }
    if (!grab) return;
    const now = groundAt(p.x, p.y);
    if (!now) return;
    view.x += grab.x - now.x;
    view.y += grab.y - now.y;
    invalidate();
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinch = 0;
    const [rest] = [...pointers.values()];
    grab = pointers.size === 1 && rest ? groundAt(rest.x, rest.y) : undefined;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    // Отпустили после перетаскивания — клик по метке под курсором не засчитываем.
    if (moved > 4) setTimeout(() => delete host.dataset.dragging, 0);
    else delete host.dataset.dragging;
  };
  const onClickCapture = (e: MouseEvent) => {
    if (host.dataset.dragging !== undefined) {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = local(e);
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(Math.exp(delta * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
  };
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onUp);
  host.addEventListener('click', onClickCapture, true);
  host.addEventListener('wheel', onWheel, { passive: false });

  const tweenTo = (to: typeof view) => {
    tween = { from: { ...view }, to, start: performance.now() };
    invalidate();
  };

  return {
    update,
    focus: (x, y, at) => {
      const to = { x, y, dist: view.dist };
      if (at) {
        // Смотрим из конечной позиции, какая точка земли попадёт в at, и сдвигаем камеру на разницу.
        const saved = { ...view };
        Object.assign(view, to);
        const g = groundAt(at.x, at.y);
        Object.assign(view, saved);
        placeCamera();
        if (g) {
          to.x += x - g.x;
          to.y += y - g.y;
        }
      }
      tweenTo(to);
    },
    onFrame: (cb) => {
      frameCb = cb;
      invalidate();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('click', onClickCapture, true);
      host.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mat = o.material as THREE.Material & { map?: THREE.Texture | null; normalMap?: THREE.Texture | null };
          mat.map?.dispose();
          mat.normalMap?.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
