/**
 * Дороги по рельефу: между точками ROADS (cyprus.ts) ищется самый «лёгкий» путь — короче и положе,
 * в обход моря. Так дорога сама огибает хребты, идёт долинами и вдоль берега, а в горах петляет.
 * Потом путь сглаживается (Чайкин). Считается один раз, при сборке сцены.
 */
import type { Road } from './cyprus';
import type { Terrain } from './terrain';

/** Шаг сетки поиска пути (единицы карты). */
const STEP = 5;
/** Единица высоты на карте — это 1 / 0.075 м, единица длины — ≈114 м: перевод в настоящий уклон. */
const GRADE = 1 / (0.075 * 114);
/** Насколько дорога не любит подъём: при уклоне 10 % путь «стоит» вчетверо дороже. */
const CLIMB = 300;

type Pt = [number, number];

/** Двоичная куча по стоимости. */
class Heap {
  private ids: number[] = [];
  private keys: number[] = [];
  get size() {
    return this.ids.length;
  }
  push(id: number, key: number) {
    const { ids, keys } = this;
    let i = ids.length;
    ids.push(id);
    keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p]! <= key) break;
      ids[i] = ids[p]!;
      keys[i] = keys[p]!;
      i = p;
    }
    ids[i] = id;
    keys[i] = key;
  }
  pop(): number {
    const { ids, keys } = this;
    const top = ids[0]!;
    const id = ids.pop()!;
    const key = keys.pop()!;
    const n = ids.length;
    if (n) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const c = l + 1 < n && keys[l + 1]! < keys[l]! ? l + 1 : l;
        if (keys[c]! >= key) break;
        ids[i] = ids[c]!;
        keys[i] = keys[c]!;
        i = c;
      }
      ids[i] = id;
      keys[i] = key;
    }
    return top;
  }
}

const NEIGHBOURS: readonly [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  // Ходы конём — направления не только по 45°: дорога не «пилит» зигзагом.
  [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1],
];

function finder(terrain: Terrain, width: number, height: number) {
  const cols = Math.floor(width / STEP) + 1;
  const rows = Math.floor(height / STEP) + 1;
  const h = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) h[j * cols + i] = terrain.heightAt(i * STEP, j * STEP);
  const cost = new Float32Array(cols * rows);
  const from = new Int32Array(cols * rows);
  const closed = new Uint8Array(cols * rows);

  /** Путь по сетке от a до b (точки карты); по суше, вода — только у самых концов. */
  return (a: Pt, b: Pt): Pt[] => {
    cost.fill(Infinity);
    from.fill(-1);
    closed.fill(0);
    const idx = ([x, y]: Pt) => Math.round(y / STEP) * cols + Math.round(x / STEP);
    const start = idx(a);
    const goal = idx(b);
    const gx = goal % cols;
    const gy = Math.floor(goal / cols);
    const heap = new Heap();
    cost[start] = 0;
    heap.push(start, 0);
    while (heap.size) {
      const c = heap.pop();
      if (c === goal) break;
      if (closed[c]) continue;
      closed[c] = 1;
      const ci = c % cols;
      const cj = Math.floor(c / cols);
      for (const [di, dj] of NEIGHBOURS) {
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
        const n = nj * cols + ni;
        if (closed[n]) continue;
        const hn = h[n]!;
        // По воде нельзя (кроме клетки цели — город может стоять у самой воды).
        if (hn < 0.3 && n !== goal) continue;
        const len = Math.hypot(di, dj) * STEP;
        const grade = (Math.abs(hn - h[c]!) / len) * GRADE;
        const g = cost[c]! + len * (1 + CLIMB * grade * grade);
        if (g < cost[n]!) {
          cost[n] = g;
          from[n] = c;
          heap.push(n, g + Math.hypot(ni - gx, nj - gy) * STEP);
        }
      }
    }
    if (from[goal] === -1) return [a, b];
    const path: Pt[] = [b];
    for (let c = from[goal]!; c !== -1 && c !== start; c = from[c]!) path.push([(c % cols) * STEP, Math.floor(c / cols) * STEP]);
    path.push(a);
    return path.toReversed();
  };
}

/** Сглаживание Чайкина: углы срезаются, концы остаются на месте. */
function chaikin(pts: Pt[], times: number): Pt[] {
  let out = pts;
  for (let t = 0; t < times; t++) {
    const next: Pt[] = [out[0]!];
    for (let i = 0; i < out.length - 1; i++) {
      const [ax, ay] = out[i]!;
      const [bx, by] = out[i + 1]!;
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(out.at(-1)!);
    out = next;
  }
  return out;
}

export interface RoutedRoad {
  path: Pt[];
  major: boolean;
}

/** Дороги по рельефу: каждая — ломаная по точкам карты, уже сглаженная. */
export function routeRoads(terrain: Terrain, roads: readonly Road[], width: number, height: number): RoutedRoad[] {
  const find = finder(terrain, width, height);
  return roads.map(({ via, major = false }) => {
    const path: Pt[] = [];
    for (let i = 0; i < via.length - 1; i++) {
      const leg = find(via[i]!, via[i + 1]!);
      path.push(...(i ? leg.slice(1) : leg));
    }
    return { path: chaikin(path, 3), major };
  });
}
