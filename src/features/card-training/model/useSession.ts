import { useCallback, useState } from 'react';
import { meetCard, recordAnswer, stageOf, statusOf, type Card, type CardStatus, type Stage } from '@/entities/card';

/** Чем кончился показ карточки: знакомство, верно, ошибка. */
export type Outcome = 'met' | 'right' | 'wrong';

const RETRY_GAP = 3;

interface SessionState {
  queue: string[];
  /** Результат первой проверки — только он идёт в расписание повторений. */
  first: Record<string, boolean>;
  attempt: number;
}

/**
 * Сессия: каждая карточка до верного ответа. Новое слово — сначала знакомство, проверка — через пару карточек;
 * ошибка тоже возвращает слово через пару карточек. Карточки берутся живыми из хранилища (`live`):
 * после знакомства у слова уже следующая ступень.
 */
export function useSession(ids: readonly string[], live: readonly Card[]) {
  const [state, setState] = useState<SessionState>(() => ({ queue: [...ids], first: {}, attempt: 0 }));
  // Как слова стояли до сессии — для итога «что продвинулось».
  const [before] = useState(() => new Map(live.filter((c) => ids.includes(c.id)).map((c) => [c.id, { stage: stageOf(c), status: statusOf(c) }])));
  const current = live.find((c) => c.id === state.queue[0]);

  const onMeet = useCallback((sentences: string[]) => {
    if (current) meetCard(current.id, sentences);
  }, [current]);

  // Побочный эффект (запись в расписание) — сразу при ответе: ушли со страницы до «Дальше» — ответ не теряется.
  const onAnswer = useCallback(
    (correct: boolean, sentence?: string) => {
      if (!current || current.id in state.first) return;
      recordAnswer(current.id, correct, sentence);
      setState((s) => ({ ...s, first: { ...s.first, [current.id]: correct } }));
    },
    [current, state.first],
  );

  const onNext = useCallback((outcome: Outcome) => {
    setState((s) => {
      const [head, ...rest] = s.queue;
      if (!head) return s;
      const at = Math.min(RETRY_GAP - 1, rest.length);
      const queue = outcome === 'right' ? rest : [...rest.slice(0, at), head, ...rest.slice(at)];
      return { ...s, queue, attempt: s.attempt + 1 };
    });
  }, []);

  const total = ids.length;
  const done = total - state.queue.length;
  const firstTry = Object.values(state.first).filter(Boolean).length;
  /** Слова, где ошиблись с первого раза, — их покажем в итоге. */
  const missed = live.filter((c) => state.first[c.id] === false);

  const growth = growthOf(before, live);

  return { current, onMeet, onAnswer, onNext, total, done, firstTry, missed, growth, finished: state.queue.length === 0, attempt: state.attempt };
}

const STAGES: readonly Stage[] = ['intro', 'recognize', 'recall', 'write'];

/** Что продвинулось за сессию: с какими словами познакомились, какие перешли на ступень строже (и на какую), какие выучены. */
export interface Growth {
  met: Card[];
  stronger: { card: Card; stage: Stage }[];
  learned: Card[];
}

function growthOf(before: ReadonlyMap<string, { stage: Stage; status: CardStatus }>, live: readonly Card[]): Growth {
  const out: Growth = { met: [], stronger: [], learned: [] };
  for (const c of live) {
    const b = before.get(c.id);
    if (!b) continue;
    const stage = stageOf(c);
    if (b.status !== 'learned' && statusOf(c) === 'learned') out.learned.push(c);
    else if (b.stage === 'intro' && c.met !== undefined) out.met.push(c);
    else if (STAGES.indexOf(stage) > STAGES.indexOf(b.stage)) out.stronger.push({ card: c, stage });
  }
  return out;
}
