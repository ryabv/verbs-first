import type { Vessel } from '../model/types';

/**
 * Заранее, в фоне, скачать three.js и черепок дня (кусок файла черепков и вырезы текстуры, без скана сосуда):
 * экран найденного черепка тогда открывается сразу.
 * Ждём, пока браузер освободится, — первое задание дня не должно тормозить. Ошибка не страшна: экран догрузит сам.
 */
export function preloadShard(vessel: Vessel, index: number, total: number): () => void {
  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    void import('./scene')
      .then(({ bakeShard }) => (cancelled ? undefined : bakeShard(vessel, index, total)))
      .catch(() => undefined);
  };
  const idle = typeof window.requestIdleCallback === 'function';
  const handle = idle ? window.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 1500);
  return () => {
    cancelled = true;
    if (idle) window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
}
