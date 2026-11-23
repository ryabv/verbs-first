/**
 * 3D-модели находок (docs/product/finds.md): собираются кодом, без внешних файлов. Бумага, кожа и камень —
 * текстуры на canvas; надписи — по-гречески, как в тексте главы. Предмет — около 2 единиц в самую длинную сторону,
 * центр — в начале координат, «лицом» к +Z.
 */
import * as THREE from 'three';
import type { StoryFind } from '../model/types';

type Icon = StoryFind['icon'];

/* ---------- текстуры ---------- */

/** Детерминированный шум: одинаковые текстуры при каждом открытии. */
function rnd(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Шрифт «от руки»: курсив шрифта заголовков сайта (Alegreya), запасной — Georgia. */
function hand(px: number) {
  const display = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'Georgia, serif';
  return `italic 500 ${px}px ${display}`;
}

/** Старая бумага: тёплый тон, волокна, пятна и потемневший край. */
function paper(w: number, h: number, seed: number, tone = '#efe3c8') {
  const { c, ctx } = canvas(w, h);
  const r = rnd(seed);
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(120, 90, 50, ${r() * 0.05})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 160; i++) {
    ctx.strokeStyle = `rgba(150, 120, 80, ${0.04 + r() * 0.05})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const x = r() * w;
    const y = r() * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 12);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = r() * w;
    const y = r() * h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + r() * 90);
    g.addColorStop(0, 'rgba(160, 110, 50, 0.10)');
    g.addColorStop(1, 'rgba(160, 110, 50, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  edge.addColorStop(0, 'rgba(110, 70, 30, 0)');
  edge.addColorStop(1, 'rgba(110, 70, 30, 0.28)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  return { c, ctx };
}

/** Чернила «от руки»: надпись с лёгким наклоном и неровной строкой. */
function ink(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, color = '#2b3a67', tilt = -0.04) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.font = hand(px);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.9;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Камень (пикролит): зелёно-голубой, с прожилками и светлыми пятнами — отполирован руками. */
function stone(seed: number) {
  const w = 512;
  const { c, ctx } = canvas(w, w);
  const r = rnd(seed);
  const g = ctx.createLinearGradient(0, 0, w, w);
  g.addColorStop(0, '#7fa59a');
  g.addColorStop(0.5, '#5e8a83');
  g.addColorStop(1, '#88ad9f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(${r() < 0.5 ? '230, 240, 225' : '40, 70, 65'}, ${0.08 + r() * 0.16})`;
    ctx.lineWidth = 1 + r() * 5;
    ctx.beginPath();
    let x = r() * w;
    let y = r() * w;
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (r() - 0.3) * 90;
      y += (r() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255, 255, 240, ${r() * 0.08})`;
    ctx.fillRect(r() * w, r() * w, 2, 2);
  }
  return texture(c);
}

/** Кожа: тёмно-коричневая, с порами и потёртостями по краю. */
function leather(seed: number) {
  const w = 512;
  const { c, ctx } = canvas(w, w);
  const r = rnd(seed);
  ctx.fillStyle = '#6b3f26';
  ctx.fillRect(0, 0, w, w);
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? '30, 15, 5' : '150, 100, 60'}, ${r() * 0.12})`;
    ctx.fillRect(r() * w, r() * w, 1 + r() * 2, 1 + r() * 2);
  }
  const edge = ctx.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w * 0.72);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(190, 140, 90, 0.35)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, w);
  // Тиснёная рамка на обложке.
  ctx.strokeStyle = 'rgba(30, 14, 4, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, w - 80, w - 80);
  ctx.strokeStyle = 'rgba(200, 150, 100, 0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, w - 92, w - 92);
  return texture(c);
}

/* ---------- материалы ---------- */

const mat = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);

/* ---------- предметы ---------- */

/** Письмо: конверт, на лицевой стороне — «Για την Άννα», на обороте — клапан и сургучная печать. */
function letter(): THREE.Group {
  const W = 2;
  const H = 1.3;
  const front = paper(1024, 666, 11);
  ink(front.ctx, 'Για την Άννα', 512, 330, 120);
  // Линия под надписью — «рукой».
  front.ctx.strokeStyle = 'rgba(43, 58, 103, 0.55)';
  front.ctx.lineWidth = 4;
  front.ctx.beginPath();
  front.ctx.moveTo(330, 420);
  front.ctx.quadraticCurveTo(520, 405, 700, 418);
  front.ctx.stroke();
  const back = paper(1024, 666, 12);
  // Клапан: треугольник с тенью сгиба.
  back.ctx.fillStyle = 'rgba(120, 90, 50, 0.10)';
  back.ctx.beginPath();
  back.ctx.moveTo(0, 0);
  back.ctx.lineTo(512, 380);
  back.ctx.lineTo(1024, 0);
  back.ctx.fill();
  back.ctx.strokeStyle = 'rgba(110, 80, 40, 0.35)';
  back.ctx.lineWidth = 3;
  back.ctx.stroke();
  const edge = mat({ color: 0xe6d8b8, roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.035), [
    edge,
    edge,
    edge,
    edge,
    mat({ map: texture(front.c), roughness: 0.85 }),
    mat({ map: texture(back.c), roughness: 0.85 }),
  ]);
  const g = new THREE.Group();
  g.add(box);
  // Печать: красный сургуч с неровным краем и оттиском.
  const seal = new THREE.Group();
  const wax = mat({ color: 0x9b1b1b, roughness: 0.35, metalness: 0.05 });
  const blob = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 28), wax);
  blob.rotation.x = Math.PI / 2;
  const relief = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 10, 28), wax);
  seal.add(blob, relief);
  seal.position.set(0, 0.03, -0.045);
  seal.rotation.y = Math.PI;
  g.add(seal);
  // Чуть выгнут — бумага не идеально плоская.
  g.rotation.z = 0.04;
  return g;
}

/** Фигурка: каменная женщина с раскрытыми руками — крестообразная, гладкая, со скруглёнными краями. */
function figurine(): THREE.Group {
  const s = new THREE.Shape();
  // Контур справа сверху вниз, потом зеркально: голова, шея, руки, тело, согнутые ноги.
  const half: [number, number][] = [
    [0.0, 1.05],
    [0.13, 1.02],
    [0.2, 0.9],
    [0.17, 0.76],
    [0.09, 0.68],
    [0.1, 0.58],
    [0.62, 0.56],
    [0.84, 0.5],
    [0.9, 0.4],
    [0.84, 0.3],
    [0.62, 0.26],
    [0.2, 0.24],
    [0.22, -0.1],
    [0.3, -0.42],
    [0.36, -0.62],
    [0.18, -0.9],
    [0.05, -0.95],
    [0.0, -0.8],
  ];
  const pts = [...half, ...half.slice(0, -1).toReversed().map(([x, y]) => [-x, y] as [number, number])];
  s.moveTo(pts[0]![0], pts[0]![1]);
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  s.setFromPoints(curve.getPoints(180));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 8, curveSegments: 64 });
  geo.center();
  // Развёртка: камень ложится по передней плоскости.
  const pos = geo.attributes.position!;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 0.45 + 0.5;
    uv[i * 2 + 1] = pos.getY(i) * 0.45 + 0.5 + pos.getZ(i) * 0.3;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mat({ map: stone(21), roughness: 0.38, metalness: 0.02 }));
  body.scale.setScalar(1.05);
  const g = new THREE.Group();
  g.add(body);
  // Глаза и линия носа — неглубокая резьба.
  const cut = mat({ color: 0x3b5a55, roughness: 0.7 });
  for (const x of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), cut);
    eye.position.set(x, 0.92, 0.2);
    g.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.02), cut);
  nose.position.set(0, 0.86, 0.2);
  g.add(nose);
  return g;
}

/** Тетрадь тёти: кожаная обложка, блок страниц, резинка и закладка-ляссе. */
function notebook(): THREE.Group {
  const W = 1.45;
  const H = 2;
  const T = 0.22;
  const g = new THREE.Group();
  const cover = mat({ map: leather(31), roughness: 0.7 });
  const coverEdge = mat({ color: 0x4e2c18, roughness: 0.75 });
  const covers = [-1, 1].map((side) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, H + 0.06, 0.035), [coverEdge, coverEdge, coverEdge, coverEdge, cover, cover]);
    m.position.z = side * (T / 2);
    return m;
  });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(T / 2 + 0.018, T / 2 + 0.018, H + 0.06, 24, 1, false, Math.PI, Math.PI), coverEdge);
  spine.position.x = -W / 2 - 0.02;
  // Блок страниц: обрез — полосками бумаги.
  const { c, ctx } = canvas(64, 256);
  ctx.fillStyle = '#efe3c8';
  ctx.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 64; i += 2) {
    ctx.fillStyle = `rgba(120, 90, 50, ${0.08 + (i % 6) * 0.01})`;
    ctx.fillRect(i, 0, 1, 256);
  }
  const edges = mat({ map: texture(c), roughness: 0.95 });
  const pages = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H - 0.04, T - 0.03), [edges, edges, edges, edges, edges, edges]);
  pages.position.x = 0.01;
  // Резинка вдоль, у правого края.
  const band = mat({ color: 0x1f1a17, roughness: 0.6 });
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, H + 0.1, T + 0.1), band);
  strap.position.x = W / 2 - 0.22;
  // Ляссе: красная лента снизу.
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.006), mat({ color: 0x8e1f24, roughness: 0.55 }));
  ribbon.position.set(0.15, -H / 2 - 0.14, 0.02);
  ribbon.rotation.z = 0.12;
  g.add(...covers, spine, pages, strap, ribbon);
  return g;
}

/** Лист из тетради: рисунок фигурки, «χαλκός» — и внизу «Λευκωσία». Слегка изогнут, край оборван. */
function page(): THREE.Group {
  const { c, ctx } = paper(768, 1024, 41, '#eadcbc');
  // Линейки тетради.
  ctx.strokeStyle = 'rgba(70, 105, 165, 0.45)';
  ctx.lineWidth = 2;
  for (let y = 90; y < 1000; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(768, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(190, 60, 60, 0.55)';
  ctx.beginPath();
  ctx.moveTo(90, 0);
  ctx.lineTo(90, 1024);
  ctx.stroke();
  // Рисунок фигурки — карандашом.
  ctx.save();
  ctx.translate(330, 400);
  ctx.strokeStyle = 'rgba(45, 45, 45, 0.95)';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(0, -190, 38, 0, Math.PI * 2);
  ctx.moveTo(-14, -152);
  ctx.lineTo(-14, -120);
  ctx.lineTo(-140, -110);
  ctx.quadraticCurveTo(-170, -80, -140, -60);
  ctx.lineTo(-40, -56);
  ctx.lineTo(-50, 70);
  ctx.quadraticCurveTo(-70, 160, -20, 200);
  ctx.lineTo(0, 170);
  ctx.lineTo(20, 200);
  ctx.quadraticCurveTo(70, 160, 50, 70);
  ctx.lineTo(40, -56);
  ctx.lineTo(140, -60);
  ctx.quadraticCurveTo(170, -80, 140, -110);
  ctx.lineTo(14, -120);
  ctx.lineTo(14, -152);
  ctx.stroke();
  ctx.restore();
  // Стрелка и слово.
  ctx.strokeStyle = 'rgba(43, 58, 103, 0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(510, 300);
  ctx.quadraticCurveTo(470, 330, 450, 360);
  ctx.stroke();
  ink(ctx, 'χαλκός', 590, 270, 86, '#1f2d5c', -0.08);
  ink(ctx, 'Λευκωσία', 400, 880, 104, '#2a1c10', -0.03);
  const map = texture(c);
  // Лист изогнут по ширине; нижний край оборван — неровная линия.
  const geo = new THREE.PlaneGeometry(1.5, 2, 24, 24);
  const pos = geo.attributes.position!;
  const r = rnd(42);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin((x / 1.5) * Math.PI) * 0.05 + (y > 0.9 ? (y - 0.9) * 0.25 : 0));
    if (x < -0.74) pos.setX(i, x + (r() - 0.5) * 0.03);
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(
    new THREE.Mesh(geo, mat({ map, roughness: 1, side: THREE.FrontSide })),
    new THREE.Mesh(geo, mat({ map: texture(paper(384, 512, 43, '#ece0c4').c), roughness: 0.9, side: THREE.BackSide })),
  );
  g.rotation.z = -0.05;
  return g;
}

/** Фотография: белая рамка, выцветший снимок моря и лодки. */
function photo(): THREE.Group {
  const { c, ctx } = canvas(640, 760);
  ctx.fillStyle = '#f3efe4';
  ctx.fillRect(0, 0, 640, 760);
  const sky = ctx.createLinearGradient(0, 40, 0, 560);
  sky.addColorStop(0, '#d9c7a4');
  sky.addColorStop(0.55, '#c7b48d');
  sky.addColorStop(0.56, '#8f8a74');
  sky.addColorStop(1, '#6f6a58');
  ctx.fillStyle = sky;
  ctx.fillRect(40, 40, 560, 520);
  ctx.fillStyle = '#4a3f30';
  ctx.beginPath();
  ctx.moveTo(250, 400);
  ctx.lineTo(400, 400);
  ctx.lineTo(380, 430);
  ctx.lineTo(270, 430);
  ctx.fill();
  ctx.fillRect(322, 300, 5, 100);
  ink(ctx, 'Κύπρος', 320, 660, 64, '#3a3a3a', -0.02);
  const face = mat({ map: texture(c), roughness: 0.55 });
  const edge = mat({ color: 0xece6d6, roughness: 0.8 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 0.02), [edge, edge, edge, edge, face, edge]));
  g.rotation.z = 0.06;
  return g;
}

/** Ключ: старинный, бронзовый — кольцо с узором, стержень и бородка. */
function key(): THREE.Group {
  const bronze = mat({ color: 0xa87a45, roughness: 0.35, metalness: 0.85 });
  const g = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 16, 48), bronze);
  bow.position.y = 0.7;
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 12, 32), bronze);
  inner.position.y = 0.7;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 20), bronze);
  shaft.position.y = -0.33;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 10, 24), bronze);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.28;
  const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.05), bronze);
  bit1.position.set(0.17, -0.95, 0);
  const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.05), bronze);
  bit2.position.set(0.12, -0.8, 0);
  g.add(bow, inner, shaft, collar, bit1, bit2);
  return g;
}

/** Кассета: тёмный корпус, бумажная наклейка с подписью, два окна катушек. */
function tape(): THREE.Group {
  const { c, ctx } = paper(800, 500, 61, '#f2ead6');
  ctx.fillStyle = 'rgba(200, 70, 60, 0.75)';
  ctx.fillRect(0, 0, 800, 70);
  ink(ctx, 'Η θεία — 1987', 400, 150, 64, '#2b3a67', -0.02);
  ctx.fillStyle = '#2a2622';
  ctx.beginPath();
  ctx.roundRect(170, 250, 460, 150, 70);
  ctx.fill();
  const label = mat({ map: texture(c), roughness: 0.8 });
  const shell = mat({ color: 0x2a2622, roughness: 0.45 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1.26, 0.18), shell));
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.95), label);
  sticker.position.set(0, 0.08, 0.091);
  g.add(sticker);
  const hub = mat({ color: 0xf3f0ea, roughness: 0.4 });
  for (const x of [-0.42, 0.42]) {
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 20), hub);
    reel.rotation.x = Math.PI / 2;
    reel.position.set(x, 0, 0.093);
    g.add(reel);
  }
  return g;
}

const BUILDERS: Record<Icon, () => THREE.Group> = { letter, figurine, notebook, map: page, photo, key, tape };

/** Собрать предмет; размер — около 2 единиц, центр — в нуле. */
export function buildFind(icon: Icon): THREE.Group {
  const object = BUILDERS[icon]();
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const k = 2 / Math.max(size.x, size.y, size.z, 0.01);
  const holder = new THREE.Group();
  object.position.sub(box.getCenter(new THREE.Vector3()));
  holder.add(object);
  holder.scale.setScalar(k);
  return holder;
}

/** Освободить геометрию, материалы и текстуры предмета. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      (m as THREE.MeshStandardMaterial).map?.dispose();
      m.dispose();
    }
  });
}
