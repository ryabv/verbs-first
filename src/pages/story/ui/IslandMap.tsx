import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PROLOGUE, STORY_PLACES as places, type StoryPlace } from '@/entities/story';
import { Medallion } from '@/shared/ui/ornament';
import { CatIcon } from './CatIcon';
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
const kicker = (p: StoryPlace) => (p.chapter === PROLOGUE ? 'Пролог' : `Глава ${p.chapter}`);
const xy = (p: StoryPlace): [number, number] => [p.x, p.y];

/** Тропа по сюжету: пройденные места и один отрезок вперёд — тропа ко всем местам выдала бы сюжет. */
function routeOf(states: readonly PlaceState[]) {
  const onIsland = places.filter((p) => !p.offMap);
  const reached = onIsland.filter((p) => states[places.indexOf(p)] !== 'fog');
  const last = reached.at(-1);
  const next = last ? onIsland[onIsland.indexOf(last) + 1] : undefined;
  return { done: reached.map(xy), ahead: last && next ? [xy(last), xy(next)] : [] };
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
          const at = places.map((p) => project(p.x, p.y));
          spread(at);
          places.forEach((p, i) => {
            const el = markers.current.get(p.chapter);
            if (el) place(el, at[i]!);
          });
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

  if (status === 'failed') return <>{fallback}</>;

  return (
    <div className={styles.band}>
      <div ref={hostRef} className={styles.host} data-status={status}>
        {status === 'loading' && <p className={styles.loading}>Рисуем остров…</p>}
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
