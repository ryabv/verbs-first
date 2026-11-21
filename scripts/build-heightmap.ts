/**
 * Карта высот Кипра для 3D-карты «Истории»: public/map/cyprus-heights.bin.
 * Источник — открытые тайлы рельефа Terrarium (AWS Open Data «Terrain Tiles», для Кипра — SRTM и ETOPO1,
 * общественное достояние). Запускается вручную, когда меняется проекция или разрешение: `pnpm map:heights`.
 *
 * Формат: HEIGHT_COLS × HEIGHT_ROWS байт, строка за строкой (y вниз), шаг HEIGHT_STEP единиц карты;
 * байт v → высота (v × 8 − 20) м: море ниже −20 м — 0. Сдвиг −20, а не кратный 8: низкий берег (0…4 м)
 * становится +4 м, а не 0 — иначе он сливается с морем.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { HEIGHT_COLS, HEIGHT_ROWS, HEIGHT_STEP } from '../src/pages/story/lib/heightmap';
import { ungeo } from '../src/pages/story/lib/cyprus';

const Z = 10;
const N = 2 ** Z;
const tileX = (lon: number) => ((lon + 180) / 360) * N;
const tileY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N;
};

/** Минимальный разбор PNG: 8 бит RGB/RGBA без чересстрочности (так отдаёт Terrarium). */
function decodePng(buf: Buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 3;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('PNG: нужен 8 бит без чересстрочности');
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[y * stride + i - channels]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + i]! : 0;
      const c = y > 0 && i >= channels ? out[(y - 1) * stride + i - channels]! : 0;
      let v = line[i]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + i] = v & 255;
    }
  }
  return { width, height, channels, data: out };
}

const tiles = new Map<string, Float32Array>();
async function fetchTile(tx: number, ty: number) {
  const key = `${tx}/${ty}`;
  {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${key}.png`);
    if (!res.ok) throw new Error(`тайл ${key}: ${res.status}`);
    const png = decodePng(Buffer.from(await res.arrayBuffer()));
    const t = new Float32Array(256 * 256);
    for (let i = 0; i < t.length; i++) {
      const o = i * png.channels;
      t[i] = png.data[o]! * 256 + png.data[o + 1]! + png.data[o + 2]! / 256 - 32768;
    }
    tiles.set(key, t);
  }
}

/** Высота в пикселе мозаики тайлов (глобальные пиксельные координаты). */
function pixel(px: number, py: number) {
  const t = tiles.get(`${Math.floor(px / 256)}/${Math.floor(py / 256)}`);
  if (!t) throw new Error(`нет тайла для пикселя ${px}, ${py}`);
  return t[(py % 256) * 256 + (px % 256)]!;
}

function elevation(lon: number, lat: number) {
  const fx = tileX(lon) * 256 - 0.5;
  const fy = tileY(lat) * 256 - 0.5;
  const x = Math.floor(fx);
  const y = Math.floor(fy);
  const u = fx - x;
  const v = fy - y;
  return pixel(x, y) * (1 - u) * (1 - v) + pixel(x + 1, y) * u * (1 - v) + pixel(x, y + 1) * (1 - u) * v + pixel(x + 1, y + 1) * u * v;
}

// Все тайлы, которые покрывают карту (с запасом в пиксель), — сразу.
const [lon0, lat0] = ungeo(0, 0);
const [lon1, lat1] = ungeo((HEIGHT_COLS - 1) * HEIGHT_STEP, (HEIGHT_ROWS - 1) * HEIGHT_STEP);
const need: Promise<void>[] = [];
for (let tx = Math.floor(tileX(lon0) - 0.01); tx <= Math.floor(tileX(lon1) + 0.01); tx++) {
  for (let ty = Math.floor(tileY(lat0) - 0.01); ty <= Math.floor(tileY(lat1) + 0.01); ty++) need.push(fetchTile(tx, ty));
}
await Promise.all(need);

const out = new Uint8Array(HEIGHT_COLS * HEIGHT_ROWS);
let max = 0;
for (let j = 0; j < HEIGHT_ROWS; j++) {
  for (let i = 0; i < HEIGHT_COLS; i++) {
    const [lon, lat] = ungeo(i * HEIGHT_STEP, j * HEIGHT_STEP);
    const h = elevation(lon, lat);
    max = Math.max(max, h);
    out[j * HEIGHT_COLS + i] = Math.max(0, Math.min(255, Math.round((h + 20) / 8)));
  }
}
mkdirSync('public/map', { recursive: true });
writeFileSync('public/map/cyprus-heights.bin', out);
console.log(`Готово: public/map/cyprus-heights.bin, ${HEIGHT_COLS}×${HEIGHT_ROWS}, тайлов ${tiles.size}, самая высокая точка ${Math.round(max)} м`);
