import { useEffect, useRef } from 'react';
import type { StoryPlace } from '@/entities/story';
import { MAP_H as H, MAP_W as W } from '../lib/island';
import { IslandArt } from './IslandArt';
import styles from './StoryMap.module.css';

export type PlaceState = 'done' | 'current' | 'open' | 'fog';

interface Props {
  places: readonly StoryPlace[];
  stateOf: (chapter: number) => PlaceState;
  selected: number;
  onSelect: (chapter: number) => void;
}

/** Порт, откуда уходит паром за край карты. */
const PORT = { x: 455, y: 528 };

const route = (list: readonly StoryPlace[]) => list.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

/**
 * Плоская карта острова — запасная, когда нет WebGL для 3D-карты (IslandMap).
 * Рисунок, тропа по сюжету и туман — в SVG; места глав — кнопки поверх (в процентах от размера карты).
 */
export function StoryMap({ places, stateOf, selected, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onIsland = places.filter((p) => !p.offMap);
  const reached = onIsland.filter((p) => stateOf(p.chapter) !== 'fog');
  const lastReached = reached.at(-1);
  // Вперёд — только один отрезок к следующему месту: тропа сквозь туман не выдаёт сюжет.
  const next = lastReached ? onIsland[onIsland.indexOf(lastReached) + 1] : onIsland[0];
  const ahead = lastReached && next ? [lastReached, next] : [];

  // На телефоне карта шире экрана и листается вбок — открываем на выбранном месте.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const current = scroller?.querySelector<HTMLElement>('[data-selected]');
    if (!scroller || !current || scroller.scrollWidth <= scroller.clientWidth) return;
    const r = current.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    scroller.scrollLeft += r.left - box.left - box.width / 2;
  }, []);

  return (
    <div className={styles.scroller} ref={scrollerRef}>
      <div className={styles.wrap}>
        <svg className={styles.map} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <IslandArt />
          {/* Паром в Пирей — за край карты. */}
          <path d={`M${PORT.x} ${PORT.y + 12} C 600 610, 820 620, 1000 600`} className={styles.ferry} />
          {ahead.length > 0 && <path d={route(ahead)} className={styles.routeAhead} />}
          {reached.length > 1 && <path d={route(reached)} className={styles.routeDone} />}
          {/* Туман над закрытыми местами. */}
          <g className={styles.fogCloud}>
            {places
              .filter((p) => stateOf(p.chapter) === 'fog')
              .map((p) => {
                return <ellipse key={p.chapter} cx={p.x} cy={p.y} rx="62" ry="38" />;
              })}
          </g>
        </svg>

        <ul className={styles.places} aria-label="Места глав на карте">
          {places.map((p) => {
            const state = stateOf(p.chapter);
            const open = state !== 'fog';
            return (
              <li
                key={p.chapter}
                className={styles.placeItem}
                style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
                data-selected={selected === p.chapter || undefined}
              >
                <button
                  type="button"
                  className={[styles.place, styles[state], selected === p.chapter && styles.selected].filter(Boolean).join(' ')}
                  aria-pressed={selected === p.chapter}
                  aria-label={open ? `Глава ${p.chapter}: ${p.name}` : `Глава ${p.chapter}: место ещё скрыто`}
                  title={open ? `Глава ${p.chapter}: ${p.name}` : `Глава ${p.chapter} — откроется позже`}
                  onClick={() => onSelect(p.chapter)}
                >
                  {state === 'current' && <span className={styles.pulse} aria-hidden="true" />}
                  <span className={styles.dot} aria-hidden="true">
                    {open ? p.chapter : '?'}
                  </span>
                </button>
                {open && <span className={styles.label}>{p.name}</span>}
                {state === 'current' && <span className={styles.here}>Анна здесь</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

