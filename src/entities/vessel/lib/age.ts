/**
 * «Ручная работа» и возраст росписи — обработка готового холста-развёртки:
 * линии чуть дрожат (кисть, не линейка), краска ложится неровно — полосами вдоль круга (сосуд расписывали на круге),
 * пятна обжига на глине, потёртости и сколы. Всё — шумом, без картинок.
 */

/** Гладкий шум на сетке `gw × gh` (по x — по кругу, шва нет). Возвращает значение −1…1 для точки холста 0…1. */
function lattice(gw: number, gh: number, rnd: () => number) {
  const g = Float32Array.from({ length: gw * (gh + 1) }, () => rnd() * 2 - 1);
  return (u: number, v: number) => {
    const x = u * gw;
    const y = Math.min(gh - 0.0001, Math.max(0, v * gh));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const at = (i: number, j: number) => g[(j * gw + (((i % gw) + gw) % gw))]!;
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

/** Цвет фона (глина или лак): самый частый цвет холста. */
function groundOf(d: Uint8ClampedArray): [number, number, number] {
  const count = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < d.length; i += 4 * 37) {
    const k = ((d[i]! >> 4) << 8) | ((d[i + 1]! >> 4) << 4) | (d[i + 2]! >> 4);
    const c = count.get(k) ?? [0, 0, 0, 0];
    c[0]++;
    c[1] += d[i]!;
    c[2] += d[i + 1]!;
    c[3] += d[i + 2]!;
    count.set(k, c);
  }
  const [n, r, g, b] = [...count.values()].reduce((m, c) => (c[0] > m[0] ? c : m));
  return [r / n, g / n, b / n];
}

export function age(ctx: OffscreenCanvasRenderingContext2D, rnd: () => number): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const src = ctx.getImageData(0, 0, W, H);
  const s = src.data;
  const out = ctx.createImageData(W, H);
  const d = out.data;
  const ground = groundOf(s);

  // Дрожь кисти: холст чуть «плывёт» — крупно и мелко.
  const wx = lattice(48, 24, rnd);
  const wy = lattice(48, 24, rnd);
  const fx = lattice(320, 160, rnd);
  const fy = lattice(320, 160, rnd);
  // Полосы краски вдоль круга: частый шум по высоте, медленно меняется по окружности.
  const streak = lattice(24, 420, rnd);
  const thin = lattice(14, 8, rnd);
  // Пятна обжига и потёртости.
  const fire = lattice(10, 5, rnd);
  const fire2 = lattice(36, 18, rnd);
  const wear = lattice(60, 30, rnd);
  const wearFine = lattice(240, 120, rnd);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const sxp = x + wx(u, v) * 3.2 + fx(u, v) * 1.1;
      const syp = y + wy(u, v) * 3.2 + fy(u, v) * 1.1;
      const ix = ((Math.round(sxp) % W) + W) % W;
      const iy = Math.min(H - 1, Math.max(0, Math.round(syp)));
      const j = (iy * W + ix) * 4;
      let r = s[j]!;
      let g = s[j + 1]!;
      let b = s[j + 2]!;
      // Сколько здесь краски (насколько цвет отличается от фона).
      const paint = Math.min(1, Math.hypot(r - ground[0], g - ground[1], b - ground[2]) / 110);
      if (paint > 0) {
        // Тонкий слой — сквозь краску просвечивает фон; полосами вдоль круга.
        const t = Math.max(0, 0.18 + 0.22 * streak(u, v) + 0.18 * thin(u, v)) * paint;
        r += (ground[0] - r) * t;
        g += (ground[1] - g) * t;
        b += (ground[2] - b) * t;
      }
      // Обжиг: тёплые и холодные облака по всей поверхности.
      const f = fire(u, v) * 0.7 + fire2(u, v) * 0.3;
      const k = 1 + f * 0.07;
      r = r * k + f * 6;
      g = g * k + f * 2;
      b = b * k - f * 3;
      // Потёртости: поверхность стёрта до светлой глины, краска — сильнее всего.
      const w = wear(u, v) * 0.75 + wearFine(u, v) * 0.25;
      if (w > 0.5) {
        const a = Math.min(1, (w - 0.5) * 3.2) * (0.35 + paint * 0.4);
        r += (226 - r) * a;
        g += (204 - g) * a;
        b += (172 - b) * a;
      }
      const i = (y * W + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);

  // Сколы: мелкие неровные пятна светлой глины с тёмным краем.
  for (let n = 0; n < 26; n++) {
    const cx = rnd() * W;
    const cy = H * (0.1 + rnd() * 0.85);
    const rad = 2 + rnd() * 7;
    ctx.beginPath();
    for (let a = 0; a < 7; a++) {
      const ang = (a / 7) * Math.PI * 2;
      const rr = rad * (0.6 + rnd() * 0.6);
      ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(214,180,140,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,35,20,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
