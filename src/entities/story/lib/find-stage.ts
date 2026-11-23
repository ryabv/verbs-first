/**
 * Сцена находки (docs/product/finds.md): предмет в тёплом сиянии — вертится рукой с инерцией, в покое медленно
 * поворачивается и покачивается. `reveal` — появление: поднимается снизу с вращением, замедляется, вспыхивает волна.
 * Миниатюры для полки — `findThumb` (один общий рендерер, картинки кэшируются).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { StoryFind } from '../model/types';
import { buildFind, disposeObject } from './find-models';

type Icon = StoryFind['icon'];

/** Шрифты сайта нужны для надписей на бумаге — ждём их до сборки предмета. */
const fontsReady = () => (document.fonts?.ready ?? Promise.resolve()).then(() => undefined);

/** Мягкий свет окружения: бумага и камень выглядят объёмно, металл — блестит. */
function environment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

function lights(scene: THREE.Scene, glow: THREE.Color) {
  scene.add(new THREE.AmbientLight(0xfff0dc, 0.5));
  const key = new THREE.DirectionalLight(0xfff2de, 1.8);
  key.position.set(1.5, 2.5, 4);
  const rimL = new THREE.DirectionalLight(glow, 1.6);
  rimL.position.set(-3, 1.5, -2);
  const rimR = new THREE.DirectionalLight(glow, 1.2);
  rimR.position.set(3, -1, -2);
  scene.add(key, rimL, rimR);
}

/** Круглое сияние или кольцо-волна (для спрайтов). */
function radial(ring: boolean): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ring ? ctx.createRadialGradient(128, 128, 80, 128, 128, 126) : ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  if (ring) {
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    g.addColorStop(0.65, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Чуть повёрнут к зрителю — так видно объём (а не плоский «фас»). */
const POSE = new THREE.Euler(-0.12, -0.3, 0);
/** Расстояние камеры: предмет занимает кадр почти целиком. */
const DIST = 4.8;

export interface FindViewer {
  dispose(): void;
}

/** Предмет крупно: вертеть рукой; `reveal` — с появлением. Цвет сияния — CSS `--reveal-glow`. */
export async function createFindViewer(host: HTMLElement, icon: Icon, { reveal = false } = {}): Promise<FindViewer> {
  await fontsReady();
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const css = getComputedStyle(host);
  const glowColor = new THREE.Color(css.getPropertyValue('--reveal-glow').trim() || '#ffcf7a');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.append(renderer.domElement);
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
  const scene = new THREE.Scene();
  scene.environment = environment(renderer);
  scene.environmentIntensity = 0.4;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, DIST);
  lights(scene, glowColor);

  const glowMap = radial(false);
  const ringMap = radial(true);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: glowColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  glow.position.z = -1.2;
  glow.scale.setScalar(4.2);
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringMap, color: glowColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  ring.position.z = -0.6;
  scene.add(glow, ring);

  const object = buildFind(icon);
  object.rotation.copy(POSE);
  const turn = new THREE.Group();
  turn.add(object);
  const holder = new THREE.Group();
  holder.add(turn);
  scene.add(holder);

  // Поворот рукой: тащим — крутится во все стороны, отпустили — докручивается по инерции.
  const canvasEl = renderer.domElement;
  canvasEl.style.touchAction = 'none';
  canvasEl.style.cursor = 'grab';
  let drag: { id: number; x: number; y: number } | undefined;
  const vel = { x: 0, y: 0 };
  let touched = 0;
  const onDown = (e: PointerEvent) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    vel.x = vel.y = 0;
    canvasEl.setPointerCapture(e.pointerId);
    canvasEl.style.cursor = 'grabbing';
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = (e.clientX - drag.x) * 0.012;
    const dy = (e.clientY - drag.y) * 0.012;
    drag.x = e.clientX;
    drag.y = e.clientY;
    vel.x = dy;
    vel.y = dx;
    spin(dx, dy);
    touched = performance.now();
  };
  const onUp = (e: PointerEvent) => {
    if (drag?.id !== e.pointerId) return;
    drag = undefined;
    canvasEl.style.cursor = 'grab';
  };
  const qx = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  function spin(dx: number, dy: number) {
    qy.setFromAxisAngle(Y, dx);
    qx.setFromAxisAngle(X, dy);
    turn.quaternion.premultiply(qy).premultiply(qx);
  }
  canvasEl.addEventListener('pointerdown', onDown);
  canvasEl.addEventListener('pointermove', onMove);
  canvasEl.addEventListener('pointerup', onUp);
  canvasEl.addEventListener('pointercancel', onUp);

  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Узкий кадр — отходим, чтобы предмет влез по ширине.
    camera.position.z = DIST * Math.max(1, 1 / camera.aspect);
    camera.updateProjectionMatrix();
    // Сияние не больше кадра: иначе его край обрезается краем холста ровной линией.
    const span = 2 * (camera.position.z - glow.position.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    glow.scale.setScalar(Math.min(4.2, span * Math.min(1, camera.aspect) * 0.96));
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const rest = new THREE.Quaternion();
  const sway = new THREE.Euler();
  const start = performance.now();
  const REVEAL = reveal && !still ? 1600 : 0;
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const t = (now - start) / 1000;
    // Появление: снизу вверх с вращением, которое гаснет; в конце — волна.
    const p = REVEAL ? Math.min(1, (now - start) / REVEAL) : 1;
    const ease = 1 - (1 - p) ** 3;
    holder.position.y = (1 - ease) * -2.6;
    holder.rotation.y = (1 - ease) * Math.PI * 3;
    holder.scale.setScalar(0.4 + 0.6 * ease);
    glow.material.opacity = 0.85 * ease;
    if (REVEAL) {
      const w = Math.max(0, ((now - start) / REVEAL - 0.85) / 0.6);
      ring.material.opacity = w > 0 && w < 1 ? (1 - w) * 0.9 : 0;
      ring.scale.setScalar(1.5 + w * 5);
    }
    // Покой: медленный поворот и покачивание (пока не трогали рукой ~2 с), инерция после руки.
    if (!drag) {
      if (Math.abs(vel.x) + Math.abs(vel.y) > 0.0005) {
        spin(vel.y, vel.x);
        vel.x *= 0.94;
        vel.y *= 0.94;
      } else if (p >= 1 && now - touched > 1500) {
        // Покой: возвращается лицом к зрителю и плавно покачивается — спинку видно, только если повернуть рукой.
        rest.setFromEuler(sway.set(still ? 0 : Math.sin(t * 0.55) * 0.08, still ? 0 : Math.sin(t * 0.4) * 0.45, 0));
        turn.quaternion.slerp(rest, 0.03);
      }
    }
    if (!still) object.position.y = Math.sin(t * 1.3) * 0.05;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvasEl.removeEventListener('pointerdown', onDown);
      canvasEl.removeEventListener('pointermove', onMove);
      canvasEl.removeEventListener('pointerup', onUp);
      canvasEl.removeEventListener('pointercancel', onUp);
      disposeObject(object);
      glowMap.dispose();
      ringMap.dispose();
      glow.material.dispose();
      ring.material.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      canvasEl.remove();
    },
  };
}

/* ---------- миниатюры для полки ---------- */

let thumbRig: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | undefined;
const thumbs = new Map<Icon, string>();

/** Миниатюра предмета (PNG с прозрачным фоном) — один рендерер на все, результат кэшируется. */
export async function findThumb(icon: Icon): Promise<string> {
  const hit = thumbs.get(icon);
  if (hit) return hit;
  await fontsReady();
  if (!thumbRig) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setSize(256, 256, false);
    const scene = new THREE.Scene();
    scene.environment = environment(renderer);
    scene.environmentIntensity = 0.4;
    lights(scene, new THREE.Color('#ffcf7a'));
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 4.4);
    thumbRig = { renderer, scene, camera };
  }
  const { renderer, scene, camera } = thumbRig;
  const object = buildFind(icon);
  object.rotation.copy(POSE);
  scene.add(object);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(object);
  disposeObject(object);
  thumbs.set(icon, url);
  return url;
}
