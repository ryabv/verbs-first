import { useCallback, useState } from 'react';
import { recordAnswer, type Card, type Direction } from '@/entities/card';

const RETRY_GAP = 3;

interface SessionState {
  queue: string[];
  /** Результат первой попытки — только он идёт в расписание повторений. */
  first: Record<string, boolean>;
  attempt: number;
}

/** Сессия: каждая карточка до верного ответа; ошибка возвращает её через пару карточек. */
export function useSession(cards: readonly Card[], dir: Direction) {
  const [state, setState] = useState<SessionState>(() => ({
    queue: cards.map((c) => c.id),
    first: {},
    attempt: 0,
  }));

  const current = cards.find((c) => c.id === state.queue[0]);

  // Побочный эффект (запись в расписание) — вне функции-обновителя: в StrictMode она вызывается дважды.
  const resolve = useCallback(
    (correct: boolean) => {
      const [head, ...rest] = state.queue;
      if (!head) return;
      const isFirst = !(head in state.first);
      if (isFirst) recordAnswer(head, dir, correct);
      const first = isFirst ? { ...state.first, [head]: correct } : state.first;
      const at = Math.min(RETRY_GAP - 1, rest.length);
      const queue = correct ? rest : [...rest.slice(0, at), head, ...rest.slice(at)];
      setState({ queue, first, attempt: state.attempt + 1 });
    },
    [state, dir],
  );

  const total = cards.length;
  const done = total - state.queue.length;
  const firstTry = Object.values(state.first).filter(Boolean).length;
  /** Слова, где ошиблись с первого раза, — их покажем в итоге. */
  const missed = cards.filter((c) => state.first[c.id] === false);

  return { current, resolve, total, done, firstTry, missed, finished: state.queue.length === 0, attempt: state.attempt };
}
