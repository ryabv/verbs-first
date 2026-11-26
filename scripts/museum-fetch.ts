/**
 * Исходники музея: полные архивы сканов из каталога (`scan` — uid Sketchfab) → `.museum-src/<сосуд>.glb`
 * (текстуры 4K–8K; GLB, который Sketchfab отдаёт сразу, урезан до 1K — не годится). Папка не в репозитории.
 * Ключ Sketchfab — переменная окружения SKETCHFAB_TOKEN (Settings → Password & API); в вывод не печатается.
 * Запуск: `pnpm museum:fetch` — скачивает только то, чего ещё нет; дальше `pnpm museum:bake`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { VESSELS } from '../src/entities/vessel/data/catalog';

const SRC = path.resolve(import.meta.dirname, '../.museum-src');
mkdirSync(SRC, { recursive: true });
const token = process.env.SKETCHFAB_TOKEN?.trim();

/** Первый файл с расширением в папке (вглубь). */
function find(dir: string, ext: string): string | undefined {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      const hit = find(p, ext);
      if (hit) return hit;
    } else if (name.endsWith(ext)) return p;
  }
  return undefined;
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
async function fetchScan(v: (typeof VESSELS)[number]) {
  const out = path.join(SRC, `${v.id}.glb`);
  if (existsSync(out)) return;
  if (!token) throw new Error(`Нет ${path.relative(process.cwd(), out)}, а ключа SKETCHFAB_TOKEN нет — скачать нечем.`);
  const res = await fetch(`https://api.sketchfab.com/v3/models/${v.scan}/download`, { headers: { Authorization: `Token ${token}` } });
  if (!res.ok) throw new Error(`${v.id}: Sketchfab ответил ${res.status}`);
  const link = ((await res.json()) as { gltf?: { url: string } }).gltf?.url;
  if (!link) throw new Error(`${v.id}: у скана нет архива glTF`);
  // Архив — чужие данные: распаковываем в свою пустую папку и читаем только как данные.
  const tmp = mkdtempSync(path.join(SRC, `.${v.id}-`));
  try {
    const zip = path.join(tmp, 'scan.zip');
    writeFileSync(zip, Buffer.from(await (await fetch(link)).arrayBuffer()));
    execFileSync('unzip', ['-q', '-o', zip, '-d', path.join(tmp, 'x')]);
    const gltf = find(path.join(tmp, 'x'), '.gltf');
    if (!gltf) throw new Error(`${v.id}: в архиве нет .gltf`);
    await io.write(out, await io.read(gltf));
    console.log(`${v.id}: ${(statSync(out).size / 1e6).toFixed(0)} МБ`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
// По одному: архивы большие.
await VESSELS.reduce((prev, v) => prev.then(() => fetchScan(v)), Promise.resolve());
