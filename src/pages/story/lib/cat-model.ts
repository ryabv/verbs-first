/**
 * Кот Ερμής на вершине Олимпа: сидит, мордой вперёд (−y сцены — на юг, к камере), хвост обвивает лапы.
 * Тёмная шерсть, белые грудка, мордочка и лапки, розовый нос и уши изнутри, янтарные глаза.
 * Размеры — в «кошачьих» единицах: высота до кончиков ушей ≈ 3,3.
 */
import * as THREE from 'three';

type Color = (name: string) => THREE.Color;

const ball = (r: number) => new THREE.SphereGeometry(r, 18, 12);

export function catModel(color: Color): THREE.Group {
  const mat = (name: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color: color(name), roughness });
  const fur = mat('--map-cat');
  const white = mat('--map-cat-light');
  const pink = mat('--map-cat-nose', 0.6);
  const eye = new THREE.MeshStandardMaterial({ color: color('--map-cat-eye'), roughness: 0.25, emissive: color('--map-cat-eye'), emissiveIntensity: 0.25 });
  const pupil = mat('--map-cat-pupil', 0.3);

  const cat = new THREE.Group();
  /** Часть кота: форма, материал, положение и (по желанию) растяжение и поворот. */
  const part = (
    shape: THREE.BufferGeometry,
    material: THREE.Material,
    [x, y, z]: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
    rot: [number, number, number] = [0, 0, 0],
  ) => {
    const mesh = new THREE.Mesh(shape, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cat.add(mesh);
    return mesh;
  };

  // Туловище: широкие бёдра сзади, к груди — уже и выше (грушей), чуть наклонено вперёд.
  part(ball(1), fur, [0, 0.2, 0.78], [0.98, 0.95, 0.8]);
  part(ball(0.78), fur, [0, -0.18, 1.6], [0.78, 0.72, 1.15], [0.08, 0, 0]);
  // Задние лапы — округлые бока у земли.
  for (const s of [-1, 1]) part(ball(0.5), fur, [s * 0.62, 0.05, 0.42], [0.7, 1.1, 0.75]);
  // Белая грудка.
  part(ball(0.55), white, [0, -0.62, 1.5], [0.6, 0.38, 0.95], [0.08, 0, 0]);

  // Передние лапы — столбиками, белые «носочки».
  for (const s of [-1, 1]) {
    part(new THREE.CylinderGeometry(0.15, 0.17, 1.1, 10).rotateX(Math.PI / 2), fur, [s * 0.27, -0.58, 0.62]);
    part(ball(0.2), white, [s * 0.27, -0.72, 0.1], [1, 1.35, 0.6]);
  }

  // Голова: чуть шире, чем выше; щёки.
  const head: [number, number, number] = [0, -0.42, 2.55];
  part(ball(0.6), fur, head, [1.08, 0.95, 0.9]);
  for (const s of [-1, 1]) part(ball(0.3), fur, [s * 0.36, -0.68, 2.4], [1, 0.8, 0.85]);
  // Белая мордочка, розовый нос.
  part(ball(0.27), white, [0, -0.93, 2.36], [1.3, 0.75, 0.8]);
  part(ball(0.075), pink, [0, -1.12, 2.47], [1.3, 0.8, 0.8]);
  // Глаза — янтарные, со зрачками-щёлками.
  for (const s of [-1, 1]) {
    part(ball(0.12), eye, [s * 0.24, -0.9, 2.66], [1, 0.6, 0.9]);
    part(ball(0.06), pupil, [s * 0.24, -0.97, 2.66], [0.35, 0.5, 1.4]);
  }
  // Уши — треугольники, чуть врозь; внутри розовые.
  for (const s of [-1, 1]) {
    const tilt: [number, number, number] = [Math.PI / 2 - 0.1, 0, -s * 0.28];
    part(new THREE.ConeGeometry(0.24, 0.55, 4), fur, [s * 0.34, -0.36, 3.07], [1, 1, 0.45], tilt);
    part(new THREE.ConeGeometry(0.15, 0.36, 4), pink, [s * 0.33, -0.45, 3.02], [1, 1, 0.3], tilt);
  }

  // Хвост: из-за спины вдоль бока и вперёд, кольцом у лап; кончик белый.
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 1.05, 0.25),
    new THREE.Vector3(0.75, 0.75, 0.18),
    new THREE.Vector3(1.08, 0.0, 0.16),
    new THREE.Vector3(0.85, -0.62, 0.16),
    new THREE.Vector3(0.35, -0.9, 0.2),
  ]);
  part(new THREE.TubeGeometry(tail, 24, 0.15, 8), fur, [0, 0, 0]);
  part(ball(0.16), white, [0.35, -0.9, 0.2]);

  return cat;
}
