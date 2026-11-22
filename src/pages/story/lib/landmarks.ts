/**
 * Приметы крупных городов (LANDMARKS, cyprus.ts): маяк Пафоса, стены Никосии, замки, акведук.
 * Простые объёмы из камня; дома и деревья вокруг расступаются (clear).
 */
import * as THREE from 'three';
import { LANDMARKS, SETTLEMENTS, type Landmark } from './cyprus';
import type { Terrain } from './terrain';

type Color = (name: string) => THREE.Color;

/** Высота стен и их толщина (единицы карты). */
const WALL_H = 2.6;
const WALL_T = 1.3;

/** Примета на суше: если по данным высот точка в море — сдвигаем к центру ближайшего города. */
function onLand(terrain: Terrain, l: Landmark): Landmark {
  if (terrain.heightAt(l.x, l.y) >= 1) return l;
  const town = SETTLEMENTS.reduce((a, b) => (Math.hypot(b.x - l.x, b.y - l.y) < Math.hypot(a.x - l.x, a.y - l.y) ? b : a));
  const d = Math.hypot(town.x - l.x, town.y - l.y) || 1;
  let { x, y } = l;
  for (let k = 0; k < 40 && terrain.heightAt(x, y) < 1; k++) {
    x += (town.x - l.x) / d;
    y += (town.y - l.y) / d;
  }
  return { ...l, x, y };
}

/** Расстояние от точки до отрезка. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

/** Точка в осях приметы (u — вдоль rot, v — поперёк) → точка карты. */
const local = (l: Landmark, u: number, v: number): [number, number] => {
  const c = Math.cos(l.rot);
  const s = Math.sin(l.rot);
  return [l.x + u * c - v * s, l.y + u * s + v * c];
};

/** Углы прямоугольных стен по кругу (в осях приметы). */
const corners = (w: number, h: number): [number, number][] => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [w / 2, h / 2],
  [-w / 2, h / 2],
];

export function landmarkLayout(terrain: Terrain) {
  const list = LANDMARKS.map((l) => onLand(terrain, l));
  /** Занято приметой: здесь не ставим домов и деревьев. margin — запас для крупного (церковь). */
  const clear = (x: number, y: number, margin = 0) =>
    list.some((l) => {
      const d = Math.hypot(x - l.x, y - l.y);
      switch (l.kind) {
        case 'lighthouse':
          return d < 5 + margin;
        case 'castle':
          return d < l.size * 0.75 + 2.5 + margin;
        case 'star':
          return d > l.radius - 3 - margin && d < l.radius + 7 + margin;
        case 'walls': {
          const pts = corners(l.w, l.h).map(([u, v]) => local(l, u, v));
          return pts.some((a, i) => {
            const b = pts[(i + 1) % 4]!;
            return segDist(x, y, a[0], a[1], b[0], b[1]) < 5 + margin;
          });
        }
        case 'aqueduct': {
          const [ax, ay] = local(l, -l.length / 2, 0);
          const [bx, by] = local(l, l.length / 2, 0);
          return segDist(x, y, ax, ay, bx, by) < 3 + margin;
        }
      }
    });
  return { list, clear };
}

/**
 * Собрать приметы в сцену. lamps — огни (x, y, z подряд, в координатах сцены),
 * lanterns — стекло фонаря маяка: вечером сцена его зажигает (emissive).
 */
export function buildLandmarks(scene: THREE.Scene, terrain: Terrain, list: readonly Landmark[], color: Color) {
  const lamps: number[] = [];
  const lantern = new THREE.MeshStandardMaterial({ color: color('--map-dome'), roughness: 0.2 });
  const stone = new THREE.MeshStandardMaterial({ color: color('--map-stone'), roughness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: color('--map-roof'), roughness: 0.6 });

  // Коробки и башни копим и ставим одним InstancedMesh: стен — сотни кусков.
  const boxes: THREE.Matrix4[] = [];
  const towers: THREE.Matrix4[] = [];
  const bastions: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  /** Земля под приметой — пониже из нескольких точек: на склоне низ уходит в землю, а не висит. */
  const ground = (x: number, y: number, r: number) =>
    Math.min(terrain.heightAt(x, y), terrain.heightAt(x + r, y), terrain.heightAt(x - r, y), terrain.heightAt(x, y + r), terrain.heightAt(x, y - r));
  /** Коробка: центр (x, y) на карте, len — вдоль угла rot (карта), dep — поперёк, top — высота над землёй. */
  const box = (x: number, y: number, len: number, dep: number, top: number, rot: number, base = ground(x, y, len / 2)) => {
    const z0 = base - 0.8;
    const z1 = base + top;
    q.setFromAxisAngle(zAxis, -rot);
    boxes.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -y, (z0 + z1) / 2), q, new THREE.Vector3(len, dep, z1 - z0)));
  };
  /** Стена от a до b — кусками по рельефу, с зубцами поверху. */
  const wall = (ax: number, ay: number, bx: number, by: number, h = WALL_H, t = WALL_T) => {
    const len = Math.hypot(bx - ax, by - ay);
    const rot = Math.atan2(by - ay, bx - ax);
    const n = Math.max(1, Math.ceil(len / 3));
    for (let k = 0; k < n; k++) {
      const x = ax + ((bx - ax) * (k + 0.5)) / n;
      const y = ay + ((by - ay) * (k + 0.5)) / n;
      const base = ground(x, y, len / n / 2);
      box(x, y, len / n + 0.2, t, h, rot, base);
      // Зубцы.
      for (let m = 0; m < Math.floor(len / n / 1.3); m++) {
        const f = (k + (m + 0.5) / Math.floor(len / n / 1.3)) / n;
        const zx = ax + (bx - ax) * f;
        const zy = ay + (by - ay) * f;
        boxes.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(zx, -zy, base + h + 0.3),
            q.setFromAxisAngle(zAxis, -rot),
            new THREE.Vector3(0.6, t, 0.6),
          ),
        );
      }
    }
  };
  const tower = (x: number, y: number, r: number, h: number) => {
    const base = ground(x, y, r);
    towers.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -y, base + (h - 0.8) / 2), q.identity(), new THREE.Vector3(r, r, h + 0.8)));
  };
  /** Бастион-«стрела» остриём наружу: (x, y) — у стены, out — направление наружу (карта). */
  const bastion = (x: number, y: number, out: number) => {
    const base = ground(x, y, 3);
    bastions.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -y, base - 0.8), q.setFromAxisAngle(zAxis, -out), new THREE.Vector3(1, 1, 1)));
  };
  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  for (const l of list) {
    switch (l.kind) {
      case 'lighthouse': {
        // Белая башня, галерея, стеклянный фонарь и купол; рядом — домик смотрителя.
        const base = ground(l.x, l.y, 1.2);
        const part = (shape: THREE.BufferGeometry, mat: THREE.Material, z: number) => {
          const m = add(new THREE.Mesh(shape.rotateX(Math.PI / 2), mat));
          m.position.set(l.x, -l.y, base + z);
        };
        part(new THREE.CylinderGeometry(0.85, 1.2, 12, 14), white, 5.2);
        part(new THREE.CylinderGeometry(1.45, 1.45, 0.35, 14), stone, 11.3);
        part(new THREE.CylinderGeometry(0.75, 0.75, 1.3, 12), lantern, 12.1);
        part(new THREE.ConeGeometry(0.95, 0.9, 12), new THREE.MeshStandardMaterial({ color: color('--map-roof-alt'), roughness: 0.6 }), 13.2);
        const [hx, hy] = local(l, 2.6, 0.6);
        box(hx, hy, 3.4, 2.4, 2.2, l.rot);
        lamps.push(l.x, -l.y, base + 12.1);
        break;
      }
      case 'castle': {
        const pts = corners(l.size, l.size).map(([u, v]) => local(l, u, v));
        pts.forEach((a, i) => {
          const b = pts[(i + 1) % 4]!;
          wall(a[0], a[1], b[0], b[1], 3.2, 1.4);
          if (l.round) tower(a[0], a[1], 1.7, 4.6);
        });
        // Донжон: у замка Лимассола он главный — крупнее.
        const k = l.round ? 0.38 : 0.62;
        box(l.x, l.y, l.size * k, l.size * k * 0.8, l.round ? 4.6 : 5.6, l.rot);
        if (!l.round) for (const [u, v] of corners(l.size * k, l.size * k * 0.8)) tower(...local(l, u, v), 0.9, 6.4);
        break;
      }
      case 'star': {
        const n = l.bastions;
        const at = (i: number): [number, number] => {
          const a = l.rot + (i / n) * Math.PI * 2;
          return [l.x + Math.cos(a) * l.radius, l.y + Math.sin(a) * l.radius];
        };
        for (let i = 0; i < n; i++) {
          // Между бастионами — две-три прямые куртины по дуге.
          for (let k = 0; k < 3; k++) {
            const a0 = l.rot + ((i + k / 3) / n) * Math.PI * 2;
            const a1 = l.rot + ((i + (k + 1) / 3) / n) * Math.PI * 2;
            wall(l.x + Math.cos(a0) * l.radius, l.y + Math.sin(a0) * l.radius, l.x + Math.cos(a1) * l.radius, l.y + Math.sin(a1) * l.radius);
          }
          bastion(...at(i), l.rot + (i / n) * Math.PI * 2);
        }
        break;
      }
      case 'walls': {
        const pts = corners(l.w, l.h).map(([u, v]) => local(l, u, v));
        pts.forEach((a, i) => {
          const b = pts[(i + 1) % 4]!;
          wall(a[0], a[1], b[0], b[1], 3);
          bastion(a[0], a[1], Math.atan2(a[1] - l.y, a[0] - l.x));
        });
        break;
      }
      case 'aqueduct': {
        // Опоры через пролёт, поверху — жёлоб; просветы между опорами читаются как арки.
        const span = 2.3;
        const n = Math.round(l.length / span);
        const tops: number[] = [];
        for (let i = 0; i <= n; i++) {
          const [x, y] = local(l, -l.length / 2 + i * span, 0);
          tops.push(ground(x, y, 0.5) + 3.6);
          box(x, y, 0.8, 1.1, 3.6, l.rot);
        }
        for (let i = 0; i < n; i++) {
          const [x, y] = local(l, -l.length / 2 + (i + 0.5) * span, 0);
          const top = (tops[i]! + tops[i + 1]!) / 2;
          q.setFromAxisAngle(zAxis, -l.rot);
          boxes.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -y, top - 0.35), q, new THREE.Vector3(span + 0.1, 1.1, 0.8)));
        }
        break;
      }
    }
  }

  const instanced = (shape: THREE.BufferGeometry, parts: THREE.Matrix4[]) => {
    if (!parts.length) return;
    const mesh = new THREE.InstancedMesh(shape, stone, parts.length);
    parts.forEach((m, i) => mesh.setMatrixAt(i, m));
    add(mesh);
  };
  instanced(new THREE.BoxGeometry(1, 1, 1), boxes);
  instanced(new THREE.CylinderGeometry(1, 1, 1, 12).rotateX(Math.PI / 2), towers);
  // Бастион: пятиугольник основанием на стене, остриём наружу (ось x).
  const arrow = new THREE.Shape([
    new THREE.Vector2(-1.2, -3.6),
    new THREE.Vector2(2.4, -3.3),
    new THREE.Vector2(5.4, 0),
    new THREE.Vector2(2.4, 3.3),
    new THREE.Vector2(-1.2, 3.6),
  ]);
  instanced(new THREE.ExtrudeGeometry(arrow, { depth: WALL_H + 1, bevelEnabled: false }), bastions);
  return { lamps, lanterns: [lantern] };
}
