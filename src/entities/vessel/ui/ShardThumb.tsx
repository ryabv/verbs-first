import { useEffect, useState } from 'react';
import type { Vessel } from '../model/types';

/** Картинка одного черепка сосуда (`index` — какой по счёту найден из `total`): рендерится один раз и кэшируется. */
export function ShardThumb({ vessel, index, total, className }: { vessel: Vessel; index: number; total: number; className?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    void import('../lib/scene')
      .then(async ({ bakeVessel, shardThumb }) => {
        await bakeVessel(vessel, total);
        if (!cancelled) setSrc(shardThumb(vessel, index, total));
      })
      .catch((e: unknown) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [vessel, index, total]);
  return src ? <img src={src} alt="" className={className} /> : <span className={className} aria-hidden="true" />;
}
