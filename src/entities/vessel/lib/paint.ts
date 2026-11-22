/**
 * Роспись сосудов — кодом, на холсте-развёртке: x — вокруг сосуда (центр холста — перед, края — зад),
 * y — вдоль профиля снизу вверх (верх холста — горло). Высоты — в единицах профиля формы (`shapes.ts`).
 * Цвета — пигменты керамики, не темы сайта: сосуд выглядит одинаково днём и ночью.
 */

export const TEX_W = 2048;
export const TEX_H = 1024;
const W = TEX_W;
const TAU = Math.PI * 2;

export interface Painter {
  ctx: OffscreenCanvasRenderingContext2D;
  /** Высота профиля → y на холсте. */
  Y: (y: number) => number;
  rnd: () => number;
}

export interface Style {
  paint: (p: Painter) => void;
  /** Шероховатость глины (0 — зеркало, 1 — мел). */
  rough: number;
  /** Чёрный лак блестит сильнее глины (аттические сосуды). */
  glaze?: boolean;
  /** Цвет ручек. */
  handle: string;
}

/* ---------- Пигменты ---------- */
const GLAZE = '#17110d';
const CLAY = '#c9733f';
const CLAY_DARK = '#7d2b18';
const BUFF = '#e6caa0';
const CREAM = '#ead7b4';
const BROWN = '#3a2214';

/* ---------- Примитивы ---------- */
function fill({ ctx }: Painter, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, W, ctx.canvas.height);
}
function band({ ctx, Y }: Painter, y0: number, y1: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(0, Y(y1), W, Y(y0) - Y(y1));
}
function line({ ctx, Y }: Painter, y: number, c: string, w = 6) {
  ctx.fillStyle = c;
  ctx.fillRect(0, Y(y) - w / 2, W, w);
}
/** n одинаковых мотивов по кругу: fn(центр x, ширина ячейки, номер). */
function repeat(n: number, fn: (x: number, w: number, i: number) => void) {
  for (let i = 0; i < n; i++) fn((i + 0.5) * (W / n), W / n, i);
}
/** Панно спереди (центр) и сзади (рисуется у обоих краёв — шов развёртки). */
function panels(fn: (x: number, back: boolean) => void) {
  fn(W / 2, false);
  fn(0, true);
  fn(W, true);
}
/** Боковые зоны под ручками. */
const SIDES = [W / 4, (3 * W) / 4];

function meander(p: Painter, y0: number, y1: number, c: string, n = 40) {
  const { ctx, Y } = p;
  const top = Y(y1);
  const bot = Y(y0);
  const h = bot - top;
  ctx.strokeStyle = c;
  ctx.lineWidth = h * 0.12;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  repeat(n, (x, w) => {
    const l = x - w / 2;
    const s = w * 0.85;
    ctx.beginPath();
    ctx.moveTo(l, bot - h * 0.1);
    ctx.lineTo(l, top + h * 0.1);
    ctx.lineTo(l + s, top + h * 0.1);
    ctx.lineTo(l + s, bot - h * 0.32);
    ctx.lineTo(l + s * 0.3, bot - h * 0.32);
    ctx.lineTo(l + s * 0.3, top + h * 0.38);
    ctx.lineTo(l + s * 0.62, top + h * 0.38);
    ctx.stroke();
  });
  line(p, y0, c, h * 0.1);
  line(p, y1, c, h * 0.1);
}
/** Язычки на плече: свисают от верхней линии. */
function tongues(p: Painter, y0: number, y1: number, c: string, n = 36, alt?: string) {
  const { ctx, Y } = p;
  const top = Y(y1);
  const h = Y(y0) - top;
  repeat(n, (x, w, i) => {
    ctx.fillStyle = alt && i % 2 ? alt : c;
    ctx.beginPath();
    ctx.ellipse(x, top, w * 0.38, h, 0, 0, Math.PI);
    ctx.fill();
  });
}
/** Лучи у ножки. */
function rays(p: Painter, y0: number, y1: number, c: string, n = 30) {
  const { ctx, Y } = p;
  const top = Y(y1);
  const bot = Y(y0);
  ctx.fillStyle = c;
  repeat(n, (x, w) => {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.42, bot);
    ctx.lineTo(x, top);
    ctx.lineTo(x + w * 0.42, bot);
    ctx.fill();
  });
}
function zigzag(p: Painter, y0: number, y1: number, c: string, n = 50, width = 5) {
  const { ctx, Y } = p;
  const top = Y(y1);
  const bot = Y(y0);
  ctx.strokeStyle = c;
  ctx.lineWidth = width;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(0, bot);
  repeat(n, (x, w) => {
    ctx.lineTo(x - w / 4, top);
    ctx.lineTo(x + w / 4, bot);
  });
  ctx.stroke();
}
function checker(p: Painter, y0: number, y1: number, c: string, n = 80) {
  const { ctx, Y } = p;
  const top = Y(y1);
  const h = (Y(y0) - top) / 2;
  ctx.fillStyle = c;
  repeat(n, (x, w, i) => ctx.fillRect(x - w / 2, i % 2 ? top : top + h, w, h));
}
function dots(p: Painter, y: number, c: string, n = 60, r = 6) {
  const { ctx, Y } = p;
  ctx.fillStyle = c;
  repeat(n, (x) => {
    ctx.beginPath();
    ctx.arc(x, Y(y), r, 0, TAU);
    ctx.fill();
  });
}
function circles(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, step: number, colors: string[], width = 6) {
  ctx.lineWidth = width;
  let k = 0;
  for (let r = r0; r <= r1; r += step) {
    ctx.strokeStyle = colors[k++ % colors.length]!;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
  }
}
/** Пальметта: веер лепестков. */
function palmette(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, c: string) {
  ctx.fillStyle = c;
  for (let k = -3; k <= 3; k++) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k * 0.32);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.55, s * 0.1, s * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(x, y, s * 0.13, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = c;
  ctx.lineWidth = s * 0.05;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + d * s * 0.3, y + s * 0.1, s * 0.22, d > 0 ? Math.PI * 0.9 : -Math.PI * 0.1, d > 0 ? Math.PI * 2.1 : Math.PI * 1.1);
    ctx.stroke();
  }
}
/** Розетка-заполнитель: кружок из точек. */
function rosette(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, TAU);
  ctx.fill();
  for (let k = 0; k < 8; k++) {
    ctx.beginPath();
    ctx.arc(x + Math.cos((k * TAU) / 8) * r, y + Math.sin((k * TAU) / 8) * r, r * 0.28, 0, TAU);
    ctx.fill();
  }
}

/* ---------- Фигуры ---------- */
type Pt = readonly [number, number];
function stroke(ctx: OffscreenCanvasRenderingContext2D, pts: Pt[], w: number) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]);
  ctx.stroke();
}

/** Человек: силуэт с толстыми конечностями; `detail` — линии поверх (процарапанные или нарисованные). */
function person(
  ctx: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  c: string,
  pose: 'run' | 'stand' | 'arms-up',
  dir = 1,
  detail?: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const k = (a: number, b: number): Pt => [a * s, b * s];
  // Голова и торс
  ctx.beginPath();
  ctx.arc(...k(0.02, -0.74), s * 0.1, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(...k(-0.1, -0.6));
  ctx.lineTo(...k(0.13, -0.6));
  ctx.lineTo(...k(0.08, -0.12));
  ctx.lineTo(...k(-0.04, -0.12));
  ctx.closePath();
  ctx.fill();
  if (pose === 'run') {
    stroke(ctx, [k(0.03, -0.14), k(0.3, 0.1), k(0.28, 0.45)], s * 0.09);
    stroke(ctx, [k(0.03, -0.14), k(-0.16, 0.16), k(-0.42, 0.24)], s * 0.09);
    stroke(ctx, [k(0.08, -0.55), k(0.28, -0.4), k(0.4, -0.58)], s * 0.07);
    stroke(ctx, [k(-0.04, -0.55), k(-0.22, -0.34), k(-0.4, -0.44)], s * 0.07);
  } else {
    // Хитон до пят
    ctx.beginPath();
    ctx.moveTo(...k(-0.06, -0.2));
    ctx.lineTo(...k(0.1, -0.2));
    ctx.lineTo(...k(0.2, 0.42));
    ctx.lineTo(...k(-0.16, 0.42));
    ctx.closePath();
    ctx.fill();
    if (pose === 'arms-up') {
      stroke(ctx, [k(-0.06, -0.56), k(-0.2, -0.78), k(-0.12, -0.98)], s * 0.06);
      stroke(ctx, [k(0.1, -0.56), k(0.24, -0.78), k(0.16, -0.98)], s * 0.06);
    } else {
      stroke(ctx, [k(0.1, -0.56), k(0.24, -0.3), k(0.4, -0.36)], s * 0.06);
      stroke(ctx, [k(-0.06, -0.56), k(-0.14, -0.2)], s * 0.06);
    }
  }
  if (detail) {
    ctx.strokeStyle = detail;
    ctx.lineWidth = Math.max(2, s * 0.012);
    for (const [a, b] of [[k(-0.06, -0.5), k(0.1, -0.5)], [k(0.0, -0.42), k(0.03, -0.2)], [k(-0.02, -0.66), k(0.07, -0.68)]] as const) {
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    }
    if (pose !== 'run') {
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(...k(-0.02 + i * 0.05, -0.15));
        ctx.lineTo(...k(-0.08 + i * 0.08, 0.4));
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Зверь фриза: лев (с гривой), пантера (анфас голова) или собака (тонкая). */
function beast(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, c: string, kind: 'lion' | 'panther' | 'dog', dir: number, detail: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineCap = 'round';
  const thin = kind === 'dog' ? 0.7 : 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.17 * thin, 0, 0, TAU);
  ctx.fill();
  // Ноги
  for (const lx of [-0.38, -0.26, 0.28, 0.4]) stroke(ctx, [[lx * s, 0], [(lx + 0.03) * s, s * 0.42]], s * 0.07 * thin);
  // Хвост
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.moveTo(-s * 0.48, -s * 0.05);
  ctx.quadraticCurveTo(-s * 0.8, -s * 0.1, -s * 0.72, -s * 0.42);
  ctx.stroke();
  // Голова
  const hx = s * 0.55;
  const hy = -s * 0.18;
  if (kind === 'lion') {
    ctx.beginPath();
    ctx.arc(hx - s * 0.05, hy, s * 0.24, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(hx + s * 0.05, hy, s * 0.15, s * 0.12 * thin, kind === 'dog' ? 0.3 : 0, 0, TAU);
  ctx.fill();
  if (kind === 'dog') {
    ctx.beginPath();
    ctx.ellipse(hx + s * 0.2, hy + s * 0.05, s * 0.1, s * 0.05, 0.4, 0, TAU);
    ctx.fill();
  }
  // Процарапанные детали: рёбра, глаз
  ctx.strokeStyle = detail;
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-s * 0.05 + i * s * 0.08, -s * 0.02, s * 0.1, 0.4, 2.4);
    ctx.stroke();
  }
  ctx.fillStyle = detail;
  ctx.beginPath();
  ctx.arc(hx + s * 0.07, hy - s * 0.03, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function bird(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, red: string, black: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.45, s * 0.24, -0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = black;
  ctx.lineWidth = s * 0.03;
  ctx.stroke();
  ctx.fillStyle = black;
  ctx.beginPath();
  ctx.arc(s * 0.42, -s * 0.22, s * 0.13, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.52, -s * 0.26);
  ctx.lineTo(s * 0.74, -s * 0.18);
  ctx.lineTo(s * 0.52, -s * 0.14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.05);
  ctx.lineTo(-s * 0.85, -s * 0.3);
  ctx.lineTo(-s * 0.8, s * 0.12);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-s * 0.05 + i * s * 0.09, -s * 0.02, s * 0.16, 0.2, 2.6);
    ctx.stroke();
  }
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.2);
  ctx.lineTo(-s * 0.06, s * 0.55);
  ctx.moveTo(s * 0.12, s * 0.2);
  ctx.lineTo(s * 0.1, s * 0.55);
  ctx.stroke();
  ctx.restore();
}
function lotus(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, red: string, black: string) {
  ctx.strokeStyle = black;
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.4, x, y);
  ctx.stroke();
  for (const a of [-0.6, 0, 0.6]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = a ? black : red;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.3, s * 0.12, s * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
/** Осьминог: голова-мешок, глаза, восемь извивающихся щупалец. */
function octopus(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, c: string, light: string, rnd: () => number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineCap = 'round';
  for (let k = 0; k < 8; k++) {
    const a0 = Math.PI * (0.05 + (k / 7) * 0.9);
    let px = 0;
    let py = s * 0.1;
    for (let t = 1; t <= 28; t++) {
      const f = t / 28;
      const a = a0 + Math.sin(f * 6 + k) * 0.6 * f;
      const r = s * (0.15 + f * 1.25);
      const nx = Math.cos(a) * r * 1.6;
      const ny = Math.sin(a) * r * 0.9 + s * 0.1;
      ctx.lineWidth = s * 0.11 * (1 - f) + 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      // Присоски — светлые точки вдоль щупальца
      if (t % 3 === 0 && f < 0.8) {
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(2, s * 0.02 * (1 - f)), 0, TAU);
        ctx.fill();
        ctx.fillStyle = c;
      }
      px = nx;
      py = ny;
    }
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.38, s * 0.3, s * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = light;
  for (const ex of [-0.13, 0.13]) {
    ctx.beginPath();
    ctx.arc(ex * s, -s * 0.05, s * 0.07, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc((rnd() - 0.5) * s * 0.4, -s * (0.3 + rnd() * 0.5), s * 0.025, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = c;
  for (const ex of [-0.13, 0.13]) {
    ctx.beginPath();
    ctx.arc(ex * s, -s * 0.05, s * 0.035, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
/** Водоросль: три волнистых стебля. */
function seaweed(ctx: OffscreenCanvasRenderingContext2D, x: number, top: number, bot: number, c: string) {
  ctx.strokeStyle = c;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * 22, bot);
    ctx.bezierCurveTo(x - 40 + k * 30, bot - (bot - top) * 0.4, x + 50 + k * 10, bot - (bot - top) * 0.7, x + k * 18, top);
    ctx.stroke();
  }
}
/**
 * Конь микенского живописного стиля (смотрит вправо, копыта на y = 0): длинная выгнутая шея, вытянутое тело,
 * тонкие ноги. Заливка краской, по телу — оставленные фоном волнистые полосы, глаз — точка фона.
 */
function horse(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, c: string, bg: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Хвост — длинный, к земле.
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.5);
  ctx.bezierCurveTo(-0.62, -0.46, -0.66, -0.3, -0.6, -0.08);
  ctx.stroke();
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.52, -0.48);
  ctx.bezierCurveTo(-0.58, -0.4, -0.6, -0.26, -0.54, -0.1);
  ctx.stroke();
  // Ноги: бедро/плечо, колено, копыто.
  const leg = (pts: [number, number][], w: number) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (const [a, b] of pts.slice(1)) ctx.lineTo(a, b);
    ctx.stroke();
    const [hx, hy] = pts.at(-1)!;
    ctx.beginPath();
    ctx.ellipse(hx + 0.012, hy - 0.008, 0.024, 0.012, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  leg([[-0.38, -0.36], [-0.33, -0.16], [-0.4, 0]], 0.03);
  leg([[-0.28, -0.32], [-0.23, -0.15], [-0.29, 0]], 0.028);
  leg([[0.24, -0.3], [0.22, -0.14], [0.2, 0]], 0.028);
  leg([[0.33, -0.32], [0.34, -0.14], [0.33, 0]], 0.03);
  // Тело, шея, голова — один контур.
  ctx.beginPath();
  ctx.moveTo(-0.46, -0.56);
  ctx.bezierCurveTo(-0.2, -0.62, 0.0, -0.57, 0.12, -0.6);
  // Шея выгнута дугой вверх, к затылку.
  ctx.bezierCurveTo(0.2, -0.7, 0.24, -1.0, 0.38, -1.06);
  // Лоб и узкая морда клином вниз-вперёд.
  ctx.bezierCurveTo(0.46, -1.08, 0.53, -0.95, 0.62, -0.84);
  ctx.bezierCurveTo(0.65, -0.8, 0.63, -0.77, 0.59, -0.78);
  ctx.bezierCurveTo(0.53, -0.79, 0.48, -0.84, 0.44, -0.86);
  // Горло и передняя сторона шеи — к груди.
  ctx.bezierCurveTo(0.39, -0.76, 0.41, -0.5, 0.36, -0.34);
  ctx.bezierCurveTo(0.26, -0.27, 0.0, -0.3, -0.2, -0.3);
  ctx.bezierCurveTo(-0.36, -0.3, -0.5, -0.34, -0.52, -0.42);
  ctx.bezierCurveTo(-0.54, -0.5, -0.52, -0.55, -0.46, -0.56);
  ctx.fill();
  // Уши и чёлка.
  ctx.beginPath();
  ctx.moveTo(0.37, -1.04);
  ctx.lineTo(0.35, -1.13);
  ctx.lineTo(0.41, -1.05);
  ctx.fill();
  // Грива — короткие штрихи по гребню шеи, назад.
  ctx.lineWidth = 0.011;
  for (let k = 0; k < 10; k++) {
    const t = k / 9;
    // Точка на гребне (та же кривая, что у контура шеи).
    const u = 1 - t;
    const px = u * u * u * 0.12 + 3 * u * u * t * 0.2 + 3 * u * t * t * 0.24 + t * t * t * 0.38;
    const py = u * u * u * -0.6 + 3 * u * u * t * -0.7 + 3 * u * t * t * -1.0 + t * t * t * -1.06;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 0.045, py - 0.012);
    ctx.stroke();
  }
  // Узор тела — волнистые полосы фона, как на микенских конях.
  ctx.strokeStyle = bg;
  ctx.lineWidth = 0.012;
  for (const yy of [-0.5, -0.42]) {
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const px = -0.4 + k * 0.03;
      const py = yy + Math.sin(k * 1.3) * 0.015;
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  // Ряд точек по шее.
  ctx.fillStyle = bg;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc(0.3 + k * 0.012, -0.58 - k * 0.075, 0.009, 0, Math.PI * 2);
    ctx.fill();
  }
  // Глаз.
  ctx.beginPath();
  ctx.arc(0.46, -0.98, 0.014, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(0.46, -0.98, 0.006, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Седок в профиль (смотрит вправо): голова с длинным носом, высокая шея, длинное одеяние в точку. */
function rider(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, c: string, bg: string, reins: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Голова: затылок, длинный нос, подбородок.
  ctx.beginPath();
  ctx.moveTo(-0.06, -1.0);
  ctx.bezierCurveTo(-0.02, -1.08, 0.08, -1.08, 0.1, -1.0);
  ctx.lineTo(0.17, -0.94);
  ctx.lineTo(0.09, -0.92);
  ctx.bezierCurveTo(0.08, -0.88, 0.05, -0.86, 0.02, -0.86);
  ctx.lineTo(0.0, -0.8);
  ctx.lineTo(-0.06, -0.82);
  ctx.bezierCurveTo(-0.1, -0.88, -0.1, -0.96, -0.06, -1.0);
  ctx.fill();
  // Глаз — большая точка фона.
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(0.05, -0.97, 0.017, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c;
  // Одеяние: от плеч вниз, контуром, внутри — точки.
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.78);
  ctx.bezierCurveTo(0.02, -0.82, 0.1, -0.78, 0.1, -0.7);
  ctx.lineTo(0.12, -0.32);
  ctx.lineTo(-0.12, -0.32);
  ctx.lineTo(-0.1, -0.7);
  ctx.closePath();
  ctx.stroke();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.beginPath();
      ctx.arc(-0.06 + col * 0.06 + (row % 2) * 0.03, -0.7 + row * 0.05, 0.011, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Рука вперёд (с вожжами) или согнутая.
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(0.06, -0.72);
  if (reins) ctx.bezierCurveTo(0.16, -0.66, 0.24, -0.66, 0.3, -0.7);
  else ctx.bezierCurveTo(0.14, -0.64, 0.16, -0.56, 0.12, -0.52);
  ctx.stroke();
  ctx.restore();
}

/**
 * Колесница микенского живописного стиля (как на кратерах из Энкоми): пара коней внахлёст, кузов-полукруг
 * со штриховкой, колесо с двойным ободом и четырьмя спицами, двое седоков, вожжи к морде.
 * `x, y` — центр сцены по земле, `s` — высота коня.
 */
function chariot(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, c: string, bg: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const hx = s * 0.45;
  // Дальний конь — чуть выше и правее, ближний поверх с контуром фона.
  horse(ctx, hx + s * 0.08, -s * 0.03, s, c, bg);
  ctx.save();
  ctx.translate(hx, 0);
  ctx.scale(s, s);
  ctx.strokeStyle = bg;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(0.12, -0.6);
  ctx.bezierCurveTo(0.2, -0.7, 0.24, -1.0, 0.38, -1.06);
  ctx.stroke();
  ctx.restore();
  horse(ctx, hx, 0, s, c, bg);
  // Дышло: от кузова к груди коня.
  ctx.lineWidth = s * 0.022;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, -s * 0.3);
  ctx.bezierCurveTo(s * 0.1, -s * 0.36, s * 0.4, -s * 0.48, s * 0.82, -s * 0.5);
  ctx.stroke();
  // Колесо: двойной обод, ступица, четыре спицы.
  const wx = -s * 0.22;
  const wy = -s * 0.2;
  const wr = s * 0.2;
  ctx.lineWidth = s * 0.018;
  for (const r of [wr, wr * 0.86]) {
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = s * 0.014;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(a) * wr * 0.86, wy + Math.sin(a) * wr * 0.86);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(wx, wy, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  // Кузов: полукруглый борт со штриховкой сеткой.
  const bx0 = -s * 0.42;
  const bx1 = -s * 0.04;
  const by0 = -s * 0.58;
  const by1 = -s * 0.28;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bx0, by1);
  ctx.lineTo(bx0, by0 + s * 0.06);
  ctx.quadraticCurveTo(bx0, by0, bx0 + s * 0.06, by0);
  ctx.lineTo(bx1 - s * 0.1, by0);
  ctx.quadraticCurveTo(bx1, by0 + s * 0.02, bx1, by1);
  ctx.closePath();
  ctx.lineWidth = s * 0.02;
  ctx.stroke();
  ctx.clip();
  ctx.lineWidth = s * 0.008;
  for (let k = -10; k < 10; k++) {
    ctx.beginPath();
    ctx.moveTo(bx0 + k * s * 0.05, by1);
    ctx.lineTo(bx0 + k * s * 0.05 + s * 0.3, by0);
    ctx.moveTo(bx0 + k * s * 0.05, by0);
    ctx.lineTo(bx0 + k * s * 0.05 + s * 0.3, by1);
    ctx.stroke();
  }
  ctx.restore();
  // Седоки над бортом.
  // Седоки стоят в кузове: ноги скрыты бортом.
  rider(ctx, -s * 0.33, -s * 0.22, s * 0.72, c, bg, false);
  rider(ctx, -s * 0.17, -s * 0.24, s * 0.72, c, bg, true);
  // Вожжи — от рук возничего к морде коня.
  ctx.lineWidth = s * 0.008;
  ctx.beginPath();
  ctx.moveTo(-s * 0.17 + s * 0.72 * 0.3, -s * 0.24 - s * 0.72 * 0.7);
  ctx.bezierCurveTo(s * 0.3, -s * 0.5, s * 0.7, -s * 0.66, hx + s * 0.56, -s * 0.8);
  ctx.stroke();
  ctx.restore();
}

/**
 * Микенская лилия — заполнитель фриза: стебель, два завитка-волюты в стороны и вниз, между ними веер тычинок
 * с точками на концах.
 */
function flower(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, c: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineCap = 'round';
  // Стебель, слегка изогнутый, утолщается книзу.
  ctx.beginPath();
  ctx.moveTo(-0.025, 0);
  ctx.bezierCurveTo(-0.05, -0.25, 0.02, -0.4, -0.012, -0.55);
  ctx.lineTo(0.012, -0.55);
  ctx.bezierCurveTo(0.05, -0.4, -0.02, -0.25, 0.025, 0);
  ctx.fill();
  // Волюты: от верха стебля в стороны, закручиваются вниз внутрь.
  ctx.lineWidth = 0.035;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -0.55);
    ctx.bezierCurveTo(d * 0.12, -0.6, d * 0.28, -0.62, d * 0.32, -0.5);
    ctx.bezierCurveTo(d * 0.35, -0.4, d * 0.26, -0.34, d * 0.2, -0.4);
    ctx.bezierCurveTo(d * 0.16, -0.44, d * 0.2, -0.49, d * 0.24, -0.46);
    ctx.stroke();
  }
  // Веер тычинок.
  ctx.lineWidth = 0.018;
  for (let k = -2; k <= 2; k++) {
    const a = -Math.PI / 2 + k * 0.28;
    const len = 0.32 - Math.abs(k) * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, -0.57);
    ctx.lineTo(Math.cos(a) * len, -0.57 + Math.sin(a) * len);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(Math.cos(a) * len, -0.57 + Math.sin(a) * len, 0.028, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Надгробная стела с фронтоном — для белофонного лекифа. */
function stele(ctx: OffscreenCanvasRenderingContext2D, x: number, top: number, bot: number, c: string) {
  const w = (bot - top) * 0.22;
  ctx.strokeStyle = c;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(x - w / 2, top + w * 0.5, w, bot - top - w * 0.5);
  ctx.moveTo(x - w * 0.62, top + w * 0.5);
  ctx.lineTo(x, top);
  ctx.lineTo(x + w * 0.62, top + w * 0.5);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.6, bot);
  ctx.lineTo(x + w * 0.6, bot);
  ctx.stroke();
}
/** Плакальщица геометрического стиля: треугольный торс, руки над головой. */
function mourner(ctx: OffscreenCanvasRenderingContext2D, x: number, top: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineWidth = h * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, top + h * 0.12, h * 0.07, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - h * 0.13, top + h * 0.22);
  ctx.lineTo(x + h * 0.13, top + h * 0.22);
  ctx.lineTo(x, top + h * 0.55);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - h * 0.13, top + h * 0.22);
  ctx.lineTo(x - h * 0.08, top);
  ctx.moveTo(x + h * 0.13, top + h * 0.22);
  ctx.lineTo(x + h * 0.08, top);
  ctx.moveTo(x, top + h * 0.55);
  ctx.lineTo(x - h * 0.08, top + h * 0.95);
  ctx.moveTo(x, top + h * 0.55);
  ctx.lineTo(x + h * 0.08, top + h * 0.95);
  ctx.stroke();
}
/** Лавровая ветвь-гирлянда: стебель по дуге, листья парами. */
function garland(ctx: OffscreenCanvasRenderingContext2D, x0: number, x1: number, y: number, sag: number, stem: string, leaf: string, berry?: string) {
  ctx.strokeStyle = stem;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y);
  ctx.stroke();
  for (let k = 1; k < 10; k++) {
    const t = k / 10;
    const px = x0 + (x1 - x0) * t;
    const py = y + sag * 4 * t * (1 - t);
    ctx.fillStyle = leaf;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(px, py + d * 10, 6, 15, d * 0.7, 0, TAU);
      ctx.fill();
    }
    if (berry && k % 3 === 0) {
      ctx.fillStyle = berry;
      ctx.beginPath();
      ctx.arc(px, py + 24, 5, 0, TAU);
      ctx.fill();
    }
  }
}

/* ---------- Стили ---------- */
export const STYLES: Record<string, Style> = {
  'red-polished': {
    rough: 0.32,
    handle: '#8c3a22',
    paint(p) {
      const { ctx, Y } = p;
      fill(p, '#9b3f25');
      const w = '#efe4d0';
      zigzag(p, 1.55, 1.68, w, 30, 4);
      zigzag(p, 1.7, 1.83, w, 30, 4);
      for (const y of [1.4, 1.43, 0.55, 0.58]) line(p, y, w, 3);
      repeat(8, (x, _w, i) => {
        ctx.strokeStyle = w;
        ctx.lineWidth = 4;
        if (i % 2) circles(ctx, x, Y(0.98), 18, 72, 18, [w], 4);
        else {
          const t = Y(1.32);
          const b = Y(0.68);
          ctx.beginPath();
          ctx.moveTo(x - 60, b);
          ctx.lineTo(x, t);
          ctx.lineTo(x + 60, b);
          ctx.closePath();
          ctx.stroke();
          for (let k = 1; k < 8; k++) {
            const yy = t + ((b - t) * k) / 8;
            const hw = (60 * k) / 8;
            ctx.beginPath();
            ctx.moveTo(x - hw, yy);
            ctx.lineTo(x + hw, yy);
            ctx.stroke();
          }
        }
      });
    },
  },
  marine: {
    rough: 0.55,
    handle: '#4a2a18',
    paint(p) {
      const c = '#4a2a18';
      fill(p, '#e7d3ad');
      band(p, 1.78, 1.95, c);
      line(p, 1.6, c, 8);
      line(p, 1.66, c, 4);
      line(p, 0.22, c, 8);
      band(p, 0, 0.12, c);
      panels((x) => octopus(p.ctx, x, p.Y(1.05), 230, c, '#e7d3ad', p.rnd));
      for (const x of SIDES) seaweed(p.ctx, x - 20, p.Y(1.4), p.Y(0.3), c);
    },
  },
  pictorial: {
    rough: 0.6,
    handle: '#6b3018',
    paint(p) {
      const c = '#6b3018';
      const bg = '#e8cfa6';
      fill(p, bg);
      band(p, 0, 0.14, c);
      for (const y of [0.24, 0.3, 0.42]) line(p, y, c, y === 0.3 ? 12 : 5);
      line(p, 1.34, c, 6);
      band(p, 1.52, 1.66, c);
      // Фриз: колесница спереди и сзади, между ними — микенские цветы.
      panels((x) => chariot(p.ctx, x - 90, p.Y(0.52), 320, c, bg));
      for (const x of SIDES) {
        flower(p.ctx, x - 80, p.Y(0.5), 230, c);
        flower(p.ctx, x + 80, p.Y(0.5), 200, c);
      }
      repeat(14, (x, _w, i) => i % 7 === 3 && rosette(p.ctx, x, p.Y(1.22), 12, c));
    },
  },
  bichrome: {
    rough: 0.6,
    handle: '#231711',
    paint(p) {
      const r = '#a8402a';
      const b = '#231711';
      fill(p, '#e3cba3');
      const rule = (y: number) => {
        line(p, y - 0.03, b, 5);
        line(p, y, r, 14);
        line(p, y + 0.03, b, 5);
      };
      for (const y of [0.28, 0.56, 1.36, 1.68, 1.98]) rule(y);
      band(p, 0, 0.1, b);
      // Пары концентрических кругов на плече и на горле
      repeat(6, (x) => circles(p.ctx, x, p.Y(1.0), 22, 110, 22, [b, r, b], 7));
      repeat(10, (x) => circles(p.ctx, x, p.Y(1.82), 12, 48, 12, [b, r], 5));
      repeat(18, (x) => circles(p.ctx, x, p.Y(0.42), 10, 34, 12, [r, b], 4));
    },
  },
  geometric: {
    rough: 0.6,
    handle: '#2a1a12',
    paint(p) {
      const c = '#2a1a12';
      fill(p, BUFF);
      band(p, 0, 0.2, c);
      for (const y of [0.28, 0.36, 0.44]) line(p, y, c, 5);
      checker(p, 0.5, 0.6, c);
      line(p, 0.64, c, 6);
      meander(p, 0.7, 0.86, c, 34);
      line(p, 0.92, c, 6);
      line(p, 1.28, c, 6);
      const top = p.Y(1.26);
      const h = p.Y(0.94) - top;
      repeat(26, (x) => mourner(p.ctx, x, top, h, c));
      meander(p, 1.33, 1.48, c, 34);
      zigzag(p, 1.52, 1.6, c, 60, 5);
      band(p, 1.64, 1.7, c);
      meander(p, 1.76, 1.9, c, 22);
      band(p, 1.95, 2.1, c);
    },
  },
  'free-field': {
    rough: 0.6,
    handle: '#231711',
    paint(p) {
      const r = '#a8402a';
      const b = '#231711';
      fill(p, CREAM);
      band(p, 1.7, 1.86, b);
      line(p, 1.62, r, 14);
      line(p, 1.58, b, 5);
      line(p, 1.66, b, 5);
      line(p, 0.3, b, 5);
      line(p, 0.24, r, 14);
      line(p, 0.18, b, 5);
      bird(p.ctx, W / 2 - 40, p.Y(0.85), 210, r, b);
      lotus(p.ctx, W / 2 + 230, p.Y(1.05), 150, r, b);
      for (const x of SIDES) circles(p.ctx, x, p.Y(0.9), 20, 90, 14, [r, b], 6);
    },
  },
  corinthian: {
    rough: 0.62,
    handle: '#2b1a12',
    paint(p) {
      const c = '#2b1a12';
      const purple = '#7a2e2a';
      fill(p, '#e8d3a8');
      tongues(p, 0.92, 1.02, c, 24, purple);
      line(p, 0.9, c, 6);
      line(p, 0.62, purple, 10);
      line(p, 0.58, c, 5);
      const kinds = ['lion', 'panther', 'dog', 'lion', 'dog', 'panther'] as const;
      repeat(6, (x, _w, i) => beast(p.ctx, x, p.Y(0.72), 150, c, kinds[i]!, i % 2 ? -1 : 1, '#e8d3a8'));
      repeat(18, (x, _w, i) => i % 3 === 1 && rosette(p.ctx, x, p.Y(0.84), 9, c));
      rays(p, 0.12, 0.5, c, 22);
      band(p, 1.1, 1.22, c);
    },
  },
  panathenaic: {
    rough: 0.7,
    glaze: true,
    handle: GLAZE,
    paint(p) {
      fill(p, CLAY);
      band(p, 0, 0.4, GLAZE);
      rays(p, 0.4, 0.62, GLAZE, 28);
      line(p, 0.66, GLAZE, 8);
      band(p, 1.55, 2.1, GLAZE);
      tongues(p, 1.38, 1.55, GLAZE, 30, CLAY_DARK);
      line(p, 1.36, GLAZE, 6);
      line(p, 0.74, GLAZE, 6);
      panels((x) => {
        person(p.ctx, x - 130, p.Y(1.02), 270, GLAZE, 'run', 1, CLAY_DARK);
        person(p.ctx, x + 110, p.Y(1.02), 270, GLAZE, 'run', 1, CLAY_DARK);
      });
      for (const x of SIDES) palmette(p.ctx, x, p.Y(1.2), 130, GLAZE);
    },
  },
  'red-figure': {
    rough: 0.7,
    glaze: true,
    handle: GLAZE,
    paint(p) {
      fill(p, GLAZE);
      panels((x, back) => {
        if (back) person(p.ctx, x, p.Y(1.08), 300, CLAY, 'stand', 1, GLAZE);
        else {
          person(p.ctx, x - 100, p.Y(1.08), 300, CLAY, 'stand', 1, GLAZE);
          person(p.ctx, x + 110, p.Y(1.08), 300, CLAY, 'run', -1, GLAZE);
        }
      });
      meander(p, 0.6, 0.72, CLAY, 44);
      tongues(p, 1.5, 1.62, CLAY, 40);
      for (const x of SIDES) palmette(p.ctx, x, p.Y(1.08), 170, CLAY);
      line(p, 1.86, CLAY, 4);
    },
  },
  nolan: {
    rough: 0.7,
    glaze: true,
    handle: GLAZE,
    paint(p) {
      fill(p, GLAZE);
      // На ноланских — по одной фигуре с каждой стороны, на маленькой полоске меандра.
      panels((x, back) => person(p.ctx, x, p.Y(1.02), 300, CLAY, back ? 'stand' : 'run', 1, GLAZE));
      panels((x) => {
        p.ctx.save();
        p.ctx.beginPath();
        p.ctx.rect(x - 230, 0, 460, TEX_H);
        p.ctx.clip();
        meander(p, 0.56, 0.66, CLAY, 40);
        p.ctx.restore();
      });
    },
  },
  'white-ground': {
    rough: 0.85,
    handle: GLAZE,
    paint(p) {
      fill(p, GLAZE);
      // Белый фон — только на тулове; плечо и низ под чёрным лаком.
      band(p, 0.5, 1.32, '#f1ebdd');
      meander(p, 1.22, 1.3, '#8a5a3a', 46);
      tongues(p, 1.36, 1.46, '#f1ebdd', 30);
      panels((x) => {
        stele(p.ctx, x, p.Y(1.12), p.Y(0.56), '#8a5a3a');
        p.ctx.save();
        p.ctx.globalAlpha = 0.9;
        person(p.ctx, x - 150, p.Y(0.98), 220, '#b3a48d', 'stand', 1, '#6b4a33');
        person(p.ctx, x + 150, p.Y(0.98), 220, '#c8b89c', 'stand', -1, '#6b4a33');
        p.ctx.restore();
      });
      line(p, 0.5, '#8a5a3a', 4);
    },
  },
  gnathia: {
    rough: 0.75,
    glaze: true,
    handle: GLAZE,
    paint(p) {
      const white = '#f0e6d2';
      const yellow = '#e2b04a';
      fill(p, GLAZE);
      repeat(6, (x, w) => garland(p.ctx, x - w / 2, x + w / 2, p.Y(1.42), 90, yellow, white, yellow));
      dots(p, 1.5, white, 90, 5);
      line(p, 1.47, yellow, 3);
      repeat(6, (x, w) => p.ctx.fillRect(x - w / 2 - 2, p.Y(1.6), 4, 30));
      // Каннелюры внизу: светлые вертикальные штрихи
      p.ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      p.ctx.lineWidth = 3;
      repeat(90, (x) => {
        p.ctx.beginPath();
        p.ctx.moveTo(x, p.Y(0.25));
        p.ctx.lineTo(x, p.Y(0.85));
        p.ctx.stroke();
      });
    },
  },
  hadra: {
    rough: 0.6,
    handle: BROWN,
    paint(p) {
      fill(p, '#e2c48e');
      band(p, 0, 0.14, BROWN);
      line(p, 0.3, BROWN, 6);
      line(p, 1.42, BROWN, 6);
      band(p, 1.78, 1.9, BROWN);
      // Лавровый венок по плечу и белые точки-ягоды
      repeat(4, (x, w) => garland(p.ctx, x - w / 2, x + w / 2, p.Y(1.38), 70, BROWN, BROWN, '#f4ecdc'));
      // На тулове спереди — сосуд-треножник и ленты
      panels((x) => {
        const { ctx, Y } = p;
        ctx.fillStyle = BROWN;
        ctx.beginPath();
        ctx.ellipse(x, Y(0.98), 70, 40, 0, 0, Math.PI);
        ctx.fill();
        for (const d of [-1, 0, 1]) stroke(ctx, [[x + d * 50, Y(0.92)], [x + d * 70, Y(0.6)]], 8);
        ctx.strokeStyle = '#f4ecdc';
        ctx.lineWidth = 4;
        for (const d of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + d * 80, Y(1.0));
          ctx.bezierCurveTo(x + d * 160, Y(0.9), x + d * 110, Y(0.7), x + d * 170, Y(0.6));
          ctx.stroke();
        }
      });
    },
  },
};
