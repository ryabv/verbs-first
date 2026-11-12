import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PROLOGUE, STORY_PLACES as places, type StoryPlace } from '@/entities/story';
import { Medallion } from '@/shared/ui/ornament';
import type { IslandScene } from '../lib/island-scene';
import styles from './IslandMap.module.css';
import type { PlaceState } from './StoryMap';

interface Props {
  stateOf: (chapter: number) => PlaceState;
  /** Доля пройденных шагов главы — кольцо вокруг текущей. */
  partOf: (chapter: number) => number;
  /** Место, чья карточка открыта; нет — ничего не выделено. */
  selected: number | undefined;
  /** Где начать: глава, у которой сейчас Анна. */
  start: number;
  onSelect: (chapter: number) => void;
  /** Заголовок страницы — картуш поверх карты, слева сверху. */
  intro: ReactNode;
  /** Карточка поверх карты (слева снизу; на телефоне — снизу во всю ширину); пусто — видна только карта. */
  panel: ReactNode;
  /** Что показать, если WebGL недоступен. */
  fallback: ReactNode;
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
export function IslandMap({ stateOf, partOf, selected, start, onSelect, intro, panel, fallback }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IslandScene | undefined>(undefined);
  const markers = useRef(new Map<number, HTMLLIElement>());
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  // Старт — приближенно у места, где сейчас Анна (чуть севернее: впереди видно остров).
  const startRef = useRef(start);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    void import('../lib/island-scene')
      .then(({ createIslandScene }) => {
        if (cancelled) return;
        const here = places.find((q) => q.chapter === startRef.current && !q.offMap) ?? places[0]!;
        const scene = createIslandScene(host, { x: here.x - 30, y: here.y - 45 });
        sceneRef.current = scene;
        scene.onFrame((project) => {
          for (const p of places) {
            const el = markers.current.get(p.chapter);
            if (!el) continue;
            const q = project(p.x, p.y);
            el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`;
            el.style.visibility = q.visible ? 'visible' : 'hidden';
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

  const select = (p: StoryPlace) => {
    onSelect(p.chapter);
    const host = hostRef.current;
    if (p.offMap || !host) return;
    // Место — в свободной от карточки части: на телефоне карточка снизу, на широком экране — слева.
    const w = host.clientWidth;
    const h = host.clientHeight;
    const at = w <= 760 ? { x: w / 2, y: h * 0.18 } : { x: 432 + (w - 432) / 2, y: h / 2 };
    sceneRef.current?.focus(p.x, p.y, at);
  };

  if (status === 'failed') return <>{fallback}</>;

  return (
    <div className={styles.band}>
      <div ref={hostRef} className={styles.host} data-status={status}>
        {status === 'loading' && <p className={styles.loading}>Рисуем остров…</p>}
        <ul className={styles.markers} aria-label="Места глав на карте">
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
                      <span className={styles.plateKicker}>{kicker(p)}</span>
                      <span className={styles.plateTitle}>{p.name}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
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
