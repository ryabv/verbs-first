import { MAP_H, MAP_W } from './cyprus';

/**
 * Настоящий рельеф Кипра (SRTM) на сетке карты: файл public/map/cyprus-heights.bin, собирает
 * scripts/build-heightmap.ts. Байт v → высота (v × 8 − 20) м.
 */
/** Шаг 2,5 единицы (≈285 м) — как у сетки рельефа: файл 801×513 байт ≈ 411 КБ. */
export const HEIGHT_STEP = 2.5;
export const HEIGHT_COLS = MAP_W / HEIGHT_STEP + 1;
export const HEIGHT_ROWS = MAP_H / HEIGHT_STEP + 1;

let data: Uint8Array | undefined;

/** Загрузить карту высот (один раз, до сборки рельефа). */
export async function loadHeightmap(): Promise<void> {
  if (data) return;
  const res = await fetch(`${process.env.BASE_URL}map/cyprus-heights.bin`);
  if (!res.ok) throw new Error(`Карта высот: ${res.status}`);
  setHeightmap(new Uint8Array(await res.arrayBuffer()));
}

/** Подставить карту высот (скрипты в Node читают файл сами). */
export function setHeightmap(bytes: Uint8Array) {
  if (bytes.length !== HEIGHT_COLS * HEIGHT_ROWS) throw new Error('Карта высот: не тот размер');
  data = bytes;
}

/** Высота над морем в метрах (билинейно). */
export function elevationAt(x: number, y: number): number {
  if (!data) throw new Error('Карта высот не загружена: сначала loadHeightmap()');
  const gx = Math.min(HEIGHT_COLS - 1.001, Math.max(0, x / HEIGHT_STEP));
  const gy = Math.min(HEIGHT_ROWS - 1.001, Math.max(0, y / HEIGHT_STEP));
  const i = Math.floor(gx);
  const j = Math.floor(gy);
  const u = gx - i;
  const v = gy - j;
  const at = (a: number, b: number) => data![b * HEIGHT_COLS + a]! * 8 - 20;
  return at(i, j) * (1 - u) * (1 - v) + at(i + 1, j) * u * (1 - v) + at(i, j + 1) * (1 - u) * v + at(i + 1, j + 1) * u * v;
}
