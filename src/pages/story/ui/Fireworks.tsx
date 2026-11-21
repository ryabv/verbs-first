import { useEffect, useRef } from 'react';
import styles from './Celebration.module.css';

/** Цвета салюта — из темы (CSS-переменные), чтобы он жил и в тёмной теме. */
/** Тяжесть для ракет, пикселей за кадр². */
const G = 0.11;

const COLOR_VARS = ['--brand-hover', '--accent', '--olive', '--map-wheat', '--map-lagoon', '--success', '--map-roof-alt'];
/** Золото — для сложного уровня: им идёт половина залпов. */
const GOLD_VARS = ['--map-wheat', '--warning'];

/** Сила салюта по уровню: лёгкий — скромно, средний — празднично, сложный — помпезно, с финальным залпом. */
export type FireworksPower = 'light' | 'medium' | 'hard';

interface Config {
  /** Сколько запускать ракеты, мс. */
  duration: number;
  /** Начало — плотные залпы: сколько мс и по сколько ракет. */
  opening: number;
  openingBurst: [number, number];
  /** Пауза между залпами в начале и потом. */
  openingGap: number;
  gap: [number, number];
  /** Искр в залпе. */
  sparks: [number, number];
  /** Доли залпов: мерцающие, двухцветные, золотые, кольцом. */
  twinkle: number;
  twoColor: number;
  gold: number;
  ring: number;
  /** Финальный залп перед концом: сколько ракет сразу (0 — без финала). */
  finale: number;
}

const CONFIG: Record<FireworksPower, Config> = {
  light: { duration: 2600, opening: 0, openingBurst: [1, 1], openingGap: 0, gap: [650, 950], sparks: [40, 60], twinkle: 0, twoColor: 0, gold: 0, ring: 0, finale: 0 },
  medium: { duration: 5000, opening: 1800, openingBurst: [2, 3], openingGap: 420, gap: [650, 1100], sparks: [70, 110], twinkle: 0.35, twoColor: 0.33, gold: 0.15, ring: 0.15, finale: 0 },
  hard: { duration: 8500, opening: 3000, openingBurst: [3, 4], openingGap: 300, gap: [380, 700], sparks: [110, 170], twinkle: 0.55, twoColor: 0.5, gold: 0.5, ring: 0.3, finale: 9 },
};

const between = ([a, b]: readonly [number, number]) => a + Math.random() * (b - a);

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Высота взрыва. */
  top: number;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  /** Мерцающие искры — у части залпов. */
  twinkle: boolean;
  /** Прошлые точки — хвост. */
  trail: { x: number; y: number }[];
}

/**
 * Салют на холсте: ракеты взлетают снизу и рассыпаются искрами с хвостами, искры падают под тяжестью и гаснут.
 * Сила — по уровню (CONFIG): длительность, плотность, золото, кольца, финальный залп.
 */
export function Fireworks({ power = 'medium' }: { power?: FireworksPower }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const css = getComputedStyle(canvas);
    const cfg = CONFIG[power];
    const read = (vars: string[]) => vars.map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
    const palette = read(COLOR_VARS);
    const golds = read(GOLD_VARS);
    const from = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)] ?? palette[0] ?? 'gold';
    const pick = () => (Math.random() < cfg.gold ? from(golds) : from(palette));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const start = performance.now();
    let nextLaunch = start;
    let last = start;
    let frame = 0;

    let finaleDone = cfg.finale === 0;

    const launch = (spread = 0.7) => {
      const x = w * (0.5 - spread / 2 + Math.random() * spread);
      const top = h * (0.12 + Math.random() * 0.3);
      rockets.push({
        x,
        y: h,
        // Чуть к центру экрана.
        vx: (w / 2 - x) * 0.004 + (Math.random() - 0.5) * 0.6,
        // Скорость, с которой ракета под тяжестью G остановится ровно на высоте top.
        vy: -Math.sqrt(2 * G * (h - top)),
        top,
        color: pick(),
      });
    };

    const explode = (r: Rocket) => {
      const count = Math.round(between(cfg.sparks));
      const twinkle = Math.random() < cfg.twinkle;
      const second = Math.random() < cfg.twoColor ? pick() : r.color;
      // Кольцо — все искры с одной скоростью: ровный круг.
      const ring = Math.random() < cfg.ring;
      const force = (0.12 + Math.random() * 0.08) * (power === 'light' ? 0.8 : power === 'hard' ? 1.15 : 1);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.1;
        const speed = force * (ring ? 1 : 0.55 + Math.random() * 0.45) * Math.sqrt(Math.min(w, h)) * 0.9;
        const max = 900 + Math.random() * 700;
        sparks.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: max,
          max,
          color: i % 2 ? second : r.color,
          twinkle,
          trail: [],
        });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 40);
      last = now;
      const elapsed = now - start;
      if (elapsed < cfg.duration && now >= nextLaunch) {
        const opening = elapsed < cfg.opening;
        const burst = opening ? Math.round(between(cfg.openingBurst)) : 1;
        for (let i = 0; i < burst; i++) launch();
        nextLaunch = now + (opening ? cfg.openingGap : between(cfg.gap));
      }
      // Финал (сложный уровень): веер ракет по всей ширине разом.
      if (!finaleDone && elapsed >= cfg.duration) {
        finaleDone = true;
        for (let i = 0; i < cfg.finale; i++) launch(0.9);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const k = dt / 16;

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]!;
        r.x += r.vx * k;
        r.y += r.vy * k;
        r.vy += G * k;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (r.y <= r.top || r.vy >= -0.4) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 6) s.trail.shift();
        s.vx *= 0.985 ** k;
        s.vy = s.vy * 0.985 ** k + 0.045 * k;
        s.x += s.vx * k;
        s.y += s.vy * k;
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const fade = s.life / s.max;
        const alpha = s.twinkle && Math.random() < 0.3 ? fade * 0.3 : fade;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const t0 = s.trail[0] ?? s;
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      if (elapsed < cfg.duration || !finaleDone || rockets.length || sparks.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [power]);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}
