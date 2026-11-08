import { useCallback, useState } from 'react';

/** Через сколько заданий вернуть фразу, на которой ошиблись. */
const RETRY_GAP = 3;

interface QueueState {
  queue: number[];
  solved: number;
  mistakes: number;
}

const initial = (size: number): QueueState => ({
  queue: Array.from({ length: size }, (_, i) => i),
  solved: 0,
  mistakes: 0,
});

/**
 * Очередь фраз: каждую нужно решить один раз.
 * Ошибочная фраза не пропадает — возвращается через пару заданий.
 */
export function useQueue(size: number) {
  const [state, setState] = useState(() => initial(size));

  const resolve = useCallback((ok: boolean) => {
    setState(({ queue, solved, mistakes }) => {
      const [head, ...rest] = queue;
      if (head === undefined) return { queue, solved, mistakes };
      if (ok) return { queue: rest, solved: solved + 1, mistakes };
      const at = Math.min(RETRY_GAP - 1, rest.length);
      return { queue: [...rest.slice(0, at), head, ...rest.slice(at)], solved, mistakes: mistakes + 1 };
    });
  }, []);

  const restart = useCallback(() => setState(initial(size)), [size]);

  return {
    current: state.queue[0],
    solved: state.solved,
    mistakes: state.mistakes,
    finished: state.queue.length === 0,
    resolve,
    restart,
  };
}
