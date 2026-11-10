import { useCallback, useMemo, useState } from 'react';
import { clearProgress, readProgress, writeProgress, type StoredProgress } from './storage';

export type StepStatus = 'done' | 'current' | 'available' | 'locked';

/**
 * Прогресс по шагам урока.
 * Все шаги открыты: путь задаёт рекомендуемый порядок, но не запрещает перескакивать.
 */
/** storageKey — из progressKey.lesson. */
export function useLessonProgress(storageKey: string, stepIds: readonly string[]) {
  const [state, setStateRaw] = useState<StoredProgress>(() => readProgress(storageKey));
  // Пишем сразу, а не в эффекте: после шага ученик может тут же уйти на карту урока,
  // и компонент размонтируется раньше, чем эффект успеет сохранить прогресс.
  const setState = useCallback(
    (update: (s: StoredProgress) => StoredProgress) =>
      setStateRaw((s) => {
        const next = update(s);
        if (next !== s) writeProgress(storageKey, next);
        return next;
      }),
    [storageKey],
  );

  const completed = useMemo(() => new Set(state.completed), [state.completed]);
  const frontier = stepIds.findIndex((id) => !completed.has(id));
  const finished = frontier === -1;
  const unlockedUntil = stepIds.length - 1;

  const currentId =
    state.current && stepIds.indexOf(state.current) !== -1 && stepIds.indexOf(state.current) <= unlockedUntil
      ? state.current
      : stepIds[finished ? 0 : frontier];

  const statusOf = useCallback(
    (id: string): StepStatus => {
      if (id === currentId) return 'current';
      if (completed.has(id)) return 'done';
      return stepIds.indexOf(id) <= unlockedUntil ? 'available' : 'locked';
    },
    [completed, currentId, stepIds, unlockedUntil],
  );

  const goTo = useCallback(
    (id: string) => {
      if (stepIds.indexOf(id) <= unlockedUntil) setState((s) => (s.current === id ? s : { ...s, current: id }));
    },
    [stepIds, unlockedUntil, setState],
  );

  /** Отметить шаг пройденным (без перехода). */
  const markDone = useCallback((id: string) => {
    setState((s) => (s.completed.includes(id) ? s : { ...s, completed: [...s.completed, id] }));
  }, [setState]);

  /** Поставить или снять отметку (например, по результату экзамена). */
  const setDone = useCallback((id: string, done: boolean) => {
    setState((s) => {
      if (s.completed.includes(id) === done) return s;
      return { ...s, completed: done ? [...s.completed, id] : s.completed.filter((x) => x !== id) };
    });
  }, [setState]);

  /** Отметить текущий шаг и перейти к следующему. */
  const completeAndNext = useCallback(() => {
    if (!currentId) return;
    const nextId = stepIds[stepIds.indexOf(currentId) + 1];
    setState((s) => ({
      completed: s.completed.includes(currentId) ? s.completed : [...s.completed, currentId],
      current: nextId ?? currentId,
    }));
  }, [currentId, stepIds, setState]);

  const reset = useCallback(() => {
    clearProgress(storageKey);
    setStateRaw({ completed: [] });
  }, [storageKey]);

  return {
    currentId,
    currentIndex: currentId ? stepIds.indexOf(currentId) : 0,
    completedCount: stepIds.filter((id) => completed.has(id)).length,
    isDone: (id: string) => completed.has(id),
    finished,
    statusOf,
    goTo,
    markDone,
    setDone,
    completeAndNext,
    reset,
  };
}
