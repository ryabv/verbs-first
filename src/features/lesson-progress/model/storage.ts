export interface StoredProgress {
  completed: string[];
  current?: string;
}

/** Ключи прогресса: путь урока и домашнее задание считаются отдельно. */
export const progressKey = {
  lesson: (lessonId: number) => `verbs-first:lesson:${lessonId}`,
  homework: (lessonId: number) => `verbs-first:homework:${lessonId}`,
};

/** localStorage может быть недоступен (приватный режим) — тогда прогресс живёт только в памяти. */
export function readProgress(key: string): StoredProgress {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { completed: [] };
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    return { completed: Array.isArray(parsed.completed) ? parsed.completed : [], current: parsed.current };
  } catch {
    return { completed: [] };
  }
}

export function writeProgress(key: string, progress: StoredProgress): void {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    /* не критично */
  }
}

export function clearProgress(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* не критично */
  }
}
