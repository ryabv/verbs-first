import { useCallback, useState } from 'react';
import type { Verb } from '@/entities/verb';
import { compareAnswer, type AnswerVerdict } from '@/shared/lib/greek';
import { randomTask, type DrillCells, type DrillTask } from './task';

/** Через сколько заданий вернуть ячейку, в которой ошиблись. */
const RETRY_GAP = 3;

interface Retry {
  task: DrillTask;
  dueIn: number;
}

export interface DrillStats {
  correct: number;
  accent: number;
  wrong: number;
}

export function useDrill(verbs: readonly Verb[], cells: DrillCells = {}) {
  const [task, setTask] = useState<DrillTask>(() => randomTask(verbs, cells));
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [stats, setStats] = useState<DrillStats>({ correct: 0, accent: 0, wrong: 0 });
  const [retries, setRetries] = useState<Retry[]>([]);

  const check = useCallback(() => {
    if (verdict || !answer.trim()) return;
    const result = compareAnswer(answer, task.accepted);
    setVerdict(result);
    setStats((s) => ({ ...s, [result]: s[result] + 1 }));
    if (result === 'wrong') setRetries((r) => [...r, { task, dueIn: RETRY_GAP }]);
  }, [answer, task, verdict]);

  const next = useCallback(() => {
    const ticked = retries.map((r) => ({ ...r, dueIn: r.dueIn - 1 }));
    const dueIndex = ticked.findIndex((r) => r.dueIn <= 0);
    if (dueIndex >= 0) {
      setTask(ticked[dueIndex]!.task);
      ticked.splice(dueIndex, 1);
    } else {
      setTask(randomTask(verbs, cells, task.key));
    }
    setRetries(ticked);
    setAnswer('');
    setVerdict(null);
  }, [retries, task.key, verbs, cells]);

  return { task, answer, setAnswer, verdict, check, next, stats };
}
