/**
 * Выпечка музея — в public/museum/: роспись каждого сосуда с состариванием и карта блеска (WebP), черепки
 * (`<сосуд>-<дней>.bin`) — по числу дней месяца сосуда (`month` в каталоге), портрет для полки и силуэт. Одинаково у всех учеников,
 * поэтому считаем один раз здесь, а страница только скачивает.
 * Запуск: `pnpm museum:bake` — после правок росписи (paint.ts, age.ts), форм (shapes.ts), резки (bake.ts)
 * или месяцев в каталоге.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createCanvas, ImageData } from '@napi-rs/canvas';
import { VESSELS } from '../src/entities/vessel/data/catalog';
import { cutVessel, packPieces, paintPortrait, paintSkin, PORTRAIT_H, PORTRAIT_W, type MakeCanvas } from '../src/entities/vessel/lib/bake';
import { TEX_H, TEX_W } from '../src/entities/vessel/lib/paint';

const OUT = path.resolve(import.meta.dirname, '../public/museum');
// Старые файлы — прочь: сосуд могли перепривязать к месяцу другой длины.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const makeCanvas: MakeCanvas = (w, h) => createCanvas(w, h);

const image = (data: Uint8ClampedArray, w: number, h: number) => {
  const c = createCanvas(w, h);
  c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  return c;
};
const webp = (data: Uint8ClampedArray, quality: number, w = TEX_W, h = TEX_H) => image(data, w, h).encodeSync('webp', quality);

let bytes = 0;
const write = (file: string, data: Uint8Array) => {
  writeFileSync(path.join(OUT, file), data);
  bytes += data.byteLength;
};

for (const v of VESSELS) {
  const t = performance.now();
  const px = paintSkin(v.id, v.shape, makeCanvas);
  write(`${v.id}.webp`, webp(px.map, 82));
  // Карта блеска — вдвое меньше: мелочей в ней нет, а видеокарте грузить вчетверо меньше.
  const rough = createCanvas(TEX_W / 2, TEX_H / 2);
  rough.getContext('2d').drawImage(image(px.rough, TEX_W, TEX_H), 0, 0, TEX_W / 2, TEX_H / 2);
  write(`${v.id}-rough.webp`, rough.encodeSync('webp', 70));
  // Полка и табличка: портрет спереди и силуэт — картинки, без 3D на странице.
  const portrait = paintPortrait(v.id, v.shape, px.map, makeCanvas);
  write(`${v.id}-photo.webp`, webp(portrait.photo, 88, PORTRAIT_W, PORTRAIT_H));
  write(`${v.id}-mask.png`, image(portrait.mask, PORTRAIT_W, PORTRAIT_H).encodeSync('png'));
  const [y, m] = v.month.split('-').map(Number) as [number, number];
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  write(`${v.id}-${days}.bin`, packPieces(cutVessel(v.id, v.shape, days)));
  console.log(`${v.id}: ${Math.round(performance.now() - t)} мс`);
}
console.log(`public/museum: ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
