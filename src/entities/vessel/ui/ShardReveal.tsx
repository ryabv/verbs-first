import { useEffect, useRef } from 'react';
import type { Vessel } from '../model/types';

/** 3D: найденный черепок прилетает в сиянии и парит. three.js грузится лениво. */
export function ShardReveal({ vessel, index, total, className }: { vessel: Vessel; index: number; total: number; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let stage: { dispose(): void } | undefined;
    void import('../lib/scene')
      .then(async ({ bakeVessel, createShardReveal }) => {
        await bakeVessel(vessel, total);
        if (!cancelled) stage = createShardReveal(host, vessel, index, total);
      })
      .catch((e: unknown) => console.error(e));
    return () => {
      cancelled = true;
      stage?.dispose();
    };
  }, [vessel, index, total]);
  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
