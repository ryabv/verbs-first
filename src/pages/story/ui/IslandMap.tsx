import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { PROLOGUE, STORY_PLACES as places, type StoryPlace } from '@/entities/story';
import { SpeakButton } from '@/features/pronounce';
import { speak } from '@/shared/lib/speech';
import { Medallion } from '@/shared/ui/ornament';
import { CatIcon } from './CatIcon';
import { airportPoint, AIRPORT, SETTLEMENTS, type Settlement } from '../lib/cyprus';
import type { IslandScene } from '../lib/island-scene';
import styles from './IslandMap.module.css';
import type { PlaceState } from './StoryMap';

/** Рассказ кота на карте: маленькая монетка на краю медальона своей главы. */
export interface MapBranch {
  /** Уникален на всей карте: «глава:id». */
  key: string;
  /** Глава, к медальону которой монетка прикреплена. */
  chapter: number;
  title: string;
  x: number;
  y: number;
  read: boolean;
}

interface Props {
  stateOf: (chapter: number) => PlaceState;
  /** Доля пройденных шагов главы — кольцо вокруг текущей. */
  partOf: (chapter: number) => number;
  /** Уровень, на котором глава пройдена («лёгкий»…), — подпись на табличке места. */
  levelOf?: (chapter: number) => string | undefined;
  /** Место, чья карточка открыта; нет — ничего не выделено. */
  selected: number | undefined;
  /** Где начать: глава, у которой сейчас Анна. */
  start: number;
  onSelect: (chapter: number) => void;
  /** Рассказы кота Ερμής — маленькие метки у мест открытых глав. */
  branches?: readonly MapBranch[];
  selectedBranch?: string;
  onSelectBranch?: (key: string) => void;
  /** Заголовок страницы — картуш поверх карты, слева сверху. */
  intro: ReactNode;
  /** Карточка поверх карты (слева снизу; на телефоне — снизу во всю ширину); пусто — видна только карта. */
  panel: ReactNode;
  /** Что показать, если WebGL недоступен. */
  fallback: ReactNode;
}

const NO_BRANCHES: readonly MapBranch[] = [];

/** Медальоны глав ближе этого (пиксели экрана) раздвигаются: иначе соседние места слипаются. */
const MIN_GAP = 64;
/** Монетки котов — по кругу у медальона главы: радиус (px) и углы (градусы, 0 — вправо, минус — вверх). */
const CAT_RADIUS = 42;
const CAT_ANGLES = [-25, -155, -65, -115];

type Screen = { x: number; y: number; visible: boolean };

/** Поставить метку в точку экрана. */
function place(el: HTMLElement, q: Screen) {
  el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`;
  el.style.visibility = q.visible ? 'visible' : 'hidden';
}

/** Раздвинуть близкие точки экрана: несколько проходов попарного отталкивания. */
function spread(points: Screen[]) {
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]!;
        const b = points[j]!;
        if (!a.visible || !b.visible) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= MIN_GAP) continue;
        // Совпали — разводим по горизонтали.
        if (d < 0.01) [dx, dy] = [1, 0];
        const push = (MIN_GAP - d) / 2 / (d || 1);
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }
  }
}
/** Церковь (центр города) под точкой экрана — только над самой картой, не над медальонами и котами. */
function churchUnder(host: HTMLElement | null, scene: IslandScene | undefined, e: { target: EventTarget | null; clientX: number; clientY: number }) {
  if (!host || !scene || !(e.target instanceof HTMLCanvasElement)) return undefined;
  const r = host.getBoundingClientRect();
  const hit = scene.churchAt(e.clientX - r.left, e.clientY - r.top);
  const found = hit && SETTLEMENTS.find((t) => t.name === hit.name);
  return found && { place: found, z: hit.z };
}
const kicker = (p: StoryPlace) => (p.chapter === PROLOGUE ? 'Пролог' : `Глава ${p.chapter}`);
const xy = (p: StoryPlace): [number, number] => [p.x, p.y];

/** Путь Анны по острову начинается у полосы аэропорта, там, где подъезд. */
const ARRIVAL = airportPoint(2, 4);
const plane = places.find((p) => p.altitude !== undefined);

/**
 * Полёт пролога: от самолёта в воздухе на продолжение оси полосы (кривая Безье — к торцу полосы самолёт
 * подходит уже вдоль неё), плавное снижение, касание у западного торца и пробег по полосе.
 */
const FLIGHT: [number, number, number][] = plane
  ? [
      ...Array.from({ length: 48 }, (_, i): [number, number, number] => {
        const t = i / 47;
        const [ax, ay] = [plane.x, plane.y];
        const [bx, by] = airportPoint(-AIRPORT.length / 2 + 3, 0);
        const [cx, cy] = airportPoint(-AIRPORT.length / 2 - 50, 0);
        const u = 1 - t;
        return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by, 0.4 + (plane.altitude! - 0.4) * u ** 1.6];
      }),
      [...airportPoint(4, 0), 0.4],
    ]
  : [];
/** Самолётик — на этой доле пути. */
const PLANE_AT = 0.42;

/**
 * Тропа по сюжету: от аэропорта через пройденные места и один отрезок вперёд — тропа ко всем местам выдала бы сюжет.
 * Пролог в воздухе — дуга полёта.
 */
function routeOf(states: readonly PlaceState[]) {
  const onIsland = places.filter((p) => !p.offMap && p.altitude === undefined);
  const reached = onIsland.filter((p) => states[places.indexOf(p)] !== 'fog');
  const last = reached.at(-1);
  const next = last ? onIsland[onIsland.indexOf(last) + 1] : onIsland[0];
  return {
    done: [ARRIVAL, ...reached.map(xy)],
    ahead: next ? [last ? xy(last) : ARRIVAL, xy(next)] : [],
    flight: FLIGHT,
  };
}

/**
 * Карта острова на весь экран под шапкой — фон страницы: 3D-рельеф (three.js, отдельный чанк), карту можно тащить
 * и приближать. Места глав — HTML-медальоны поверх холста: их положение пересчитывается
 * после каждого кадра, без перерисовки React.
 */
export function IslandMap({ stateOf, partOf, levelOf, selected, start, onSelect, branches = NO_BRANCHES, selectedBranch, onSelectBranch, intro, panel, fallback }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IslandScene | undefined>(undefined);
  const markers = useRef(new Map<number, HTMLLIElement>());
  // Метки рассказов кота: координаты — в data-x/data-y, чтобы цикл кадра не зависел от React.
  const catMarkers = useRef(new Map<string, HTMLLIElement>());
  const planeRef = useRef<HTMLLIElement>(null);
  /** Название города над церковью: под курсором или закреплённое кликом (тапом). */
  const townRef = useRef<HTMLDivElement>(null);
  const [town, setTown] = useState<{ place: Settlement; z: number; pinned: boolean }>();
  const townAt = useRef<{ x: number; y: number; z: number } | undefined>(undefined);
  const townHide = useRef(0);
  const projectRef = useRef<((x: number, y: number, z?: number) => Screen) | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  // Старт — приближенно у места, где сейчас Анна (чуть севернее: впереди видно остров).
  const startRef = useRef(start);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    void import('../lib/island-scene')
      .then(async ({ createIslandScene, loadHeightmap }) => {
        await loadHeightmap();
        if (cancelled) return;
        const here = places.find((q) => q.chapter === startRef.current && !q.offMap) ?? places[0]!;
        const scene = createIslandScene(host, { x: here.x - 30, y: here.y - 45 });
        sceneRef.current = scene;
        scene.onFrame((project) => {
          projectRef.current = project;
          const townEl = townRef.current;
          if (townEl && townAt.current) place(townEl, project(townAt.current.x, townAt.current.y, townAt.current.z));
          const at = places.map((p) => project(p.x, p.y, p.altitude));
          spread(at);
          places.forEach((p, i) => {
            const el = markers.current.get(p.chapter);
            if (el) place(el, at[i]!);
          });
          // Самолётик на дуге полёта — носом по направлению движения на экране.
          const planeEl = planeRef.current;
          if (planeEl && FLIGHT.length) {
            const k = Math.round(PLANE_AT * (FLIGHT.length - 1));
            const a = project(...FLIGHT[k]!);
            const b = project(...FLIGHT[k + 1]!);
            place(planeEl, a);
            planeEl.style.setProperty('--angle', `${Math.atan2(b.y - a.y, b.x - a.x)}rad`);
          }
          // Коты — по кругу у медальона своей главы, по порядку.
          const used = new Map<number, number>();
          for (const el of catMarkers.current.values()) {
            const chapter = Number(el.dataset.chapter);
            const q = at[places.findIndex((p) => p.chapter === chapter)];
            if (!q) continue;
            const n = used.get(chapter) ?? 0;
            used.set(chapter, n + 1);
            const angle = ((CAT_ANGLES[n % CAT_ANGLES.length]!) * Math.PI) / 180;
            place(el, { x: q.x + Math.cos(angle) * CAT_RADIUS, y: q.y + Math.sin(angle) * CAT_RADIUS, visible: q.visible });
          }
        });
        setStatus('ready');
      })
      .catch((error: unknown) => {
        // Нет WebGL или сцена не собралась — показываем плоскую карту, причину — в консоль.
        console.error('Карта острова: 3D-сцена не запустилась', error);
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = undefined;
    };
  }, []);

  // Тропа — по прогрессу.
  const states = places.map((p) => stateOf(p.chapter));
  const stateKey = states.join();
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || status !== 'ready') return;
    scene.update(routeOf(stateKey.split(',') as PlaceState[]));
  }, [status, stateKey]);

  /** Точка — в свободной от карточки части экрана. */
  const focus = (x: number, y: number) => {
    const host = hostRef.current;
    if (!host) return;
    // Место — в свободной от карточки части: на телефоне карточка снизу, на широком экране — слева.
    const w = host.clientWidth;
    const h = host.clientHeight;
    const at = w <= 760 ? { x: w / 2, y: h * 0.18 } : { x: 432 + (w - 432) / 2, y: h / 2 };
    sceneRef.current?.focus(x, y, at);
  };
  const select = (p: StoryPlace) => {
    onSelect(p.chapter);
    if (!p.offMap) focus(p.x, p.y);
  };
  const selectBranch = (b: MapBranch) => {
    onSelectBranch?.(b.key);
    focus(b.x, b.y);
  };

  // Подпись — над куполом; дальше её двигает onFrame вместе с картой.
  useLayoutEffect(() => {
    townAt.current = town && { x: town.place.x, y: town.place.y, z: town.z };
    const el = townRef.current;
    if (!el) return;
    if (town && projectRef.current) place(el, projectRef.current(town.place.x, town.place.y, town.z));
    else el.style.visibility = 'hidden';
  }, [town]);
  useEffect(() => () => clearTimeout(townHide.current), []);
  // Клик (тап) по церкви — подпись остаётся и название звучит; клик мимо — подпись убирается.
  // Клик после перетаскивания карту не трогает: его гасит сцена.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onClick = (e: globalThis.MouseEvent) => {
      if (townRef.current?.contains(e.target as Node)) return;
      const hit = churchUnder(host, sceneRef.current, e);
      setTown(hit && { ...hit, pinned: true });
      if (hit) void speak(hit.place.greek);
    };
    host.addEventListener('click', onClick);
    return () => host.removeEventListener('click', onClick);
  }, []);

  /** Навели мышью на церковь — над куполом название города. Ушли — гаснет не сразу: можно дотянуться до 🔊. */
  const hoverTown = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || e.buttons) return;
    if (townRef.current?.contains(e.target as Node)) return clearTimeout(townHide.current);
    const hit = churchUnder(hostRef.current, sceneRef.current, e);
    if (hit) {
      clearTimeout(townHide.current);
      if (hit.place !== town?.place) setTown({ ...hit, pinned: false });
    } else if (town && !town.pinned) {
      clearTimeout(townHide.current);
      townHide.current = window.setTimeout(() => setTown((t) => (t?.pinned ? t : undefined)), 350);
    }
  };
  const leaveTown = () => setTown((t) => (t?.pinned ? t : undefined));

  if (status === 'failed') return <>{fallback}</>;

  return (
    <div className={styles.band}>
      <div
        ref={hostRef}
        className={styles.host}
        data-status={status}
        onPointerMove={hoverTown}
        onPointerLeave={leaveTown}
      >
        {status === 'loading' && <p className={styles.loading}>Рисуем остров…</p>}
        <div ref={townRef} className={`${styles.marker} ${styles.townAnchor} light-palette`}>
          {town && (
            <div className={styles.town}>
              <span className={styles.townGreek} lang="el">
                {town.place.greek}
              </span>
              <SpeakButton text={town.place.greek} />
              <span className={styles.townName}>{town.place.name}</span>
            </div>
          )}
        </div>
        {/* Метки — всегда светлые (light-palette): на вечерней карте тёмные монеты терялись. */}
        <ul className={`${styles.markers} light-palette`} aria-label="Места глав на карте">
          {places.map((p, i) => {
            const state = states[i]!;
            const open = state !== 'fog';
            const isSelected = selected === p.chapter;
            return (
              <li
                key={p.chapter}
                ref={(el) => {
                  if (el) markers.current.set(p.chapter, el);
                  else markers.current.delete(p.chapter);
                }}
                className={styles.marker}
                data-state={state}
                data-selected={isSelected || undefined}
                style={{ '--part': partOf(p.chapter) } as CSSProperties}
              >
                <button
                  type="button"
                  className={styles.markerBtn}
                  aria-pressed={isSelected}
                  aria-label={open ? `${kicker(p)}: ${p.name}` : `${kicker(p)}: место ещё скрыто`}
                  onClick={() => select(p)}
                >
                  {state === 'current' && <span className={styles.here}>Анна здесь</span>}
                  <span className={styles.ring}>
                    {open ? (
                      <Medallion n={p.chapter} letter={p.chapter === PROLOGUE ? 'αβ' : undefined} earned={state === 'done'} size="2.7rem" />
                    ) : (
                      <span className={styles.fogMark} aria-hidden="true">
                        ?
                      </span>
                    )}
                  </span>
                  {open && (
                    <span className={styles.plate}>
                      <span className={styles.plateKicker}>
                        {kicker(p)}
                        {levelOf?.(p.chapter) && ` · ${levelOf(p.chapter)}`}
                      </span>
                      <span className={styles.plateTitle}>{p.name}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {plane && (
            <li ref={planeRef} className={styles.marker} aria-hidden="true">
              <span className={styles.plane}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path
                    d="M21.5 12c0-.8-.7-1.4-1.5-1.4h-5.3L9.6 3H7.7l2.6 7.6H5.2L3.6 8.4H2l1 3.6-1 3.6h1.6l1.6-2.2h5.1L7.7 21h1.9l5.1-7.6H20c.8 0 1.5-.6 1.5-1.4Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </li>
          )}
          {branches.map((b) => (
            <li
              key={b.key}
              ref={(el) => {
                if (el) catMarkers.current.set(b.key, el);
                else catMarkers.current.delete(b.key);
              }}
              className={styles.marker}
              data-chapter={b.chapter}
              data-cat={b.read ? 'read' : 'open'}
              data-selected={selectedBranch === b.key || undefined}
            >
              <button
                type="button"
                className={styles.catBtn}
                aria-pressed={selectedBranch === b.key}
                aria-label={`Рассказ кота Ερμής: ${b.title}${b.read ? ' — прочитан' : ''}`}
                title={b.title}
                onClick={() => selectBranch(b)}
              >
                <CatIcon size="1.15rem" />
                {b.read && (
                  <span className={styles.catRead} aria-hidden="true">
                    <svg viewBox="0 0 12 12" width="9" height="9">
                      <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <p className={styles.hint}>Тащите карту, колесо или щипок — масштаб</p>
      </div>
      <div className={styles.side}>
        <div className={styles.intro}>{intro}</div>
        {panel && <div className={styles.panel}>{panel}</div>}
      </div>
    </div>
  );
}
