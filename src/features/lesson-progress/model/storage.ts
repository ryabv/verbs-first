export interface StoredProgress {
  completed: string[];
  current?: string;
}

/**
 * Ключ прогресса урока: урок, ДЗ и экзамен — один путь.
 * Раньше ДЗ хранилось отдельно (`verbs-first:homework:<id>`) — его вливаем при чтении.
 */
export const progressKey = {
  lesson: (lessonId: number) => `verbs-first:lesson:${lessonId}`,
  /** Разделы алфавита (до курса). */
  alphabet: 'verbs-first:alphabet:progress',
};

/** Старый ключ ДЗ — только у уроков; у прочих ключей (алфавит) его нет. */
const legacyHomeworkKey = (storageKey: string): string | null =>
  storageKey.startsWith('verbs-first:lesson:') ? storageKey.replace('verbs-first:lesson:', 'verbs-first:homework:') : null;

/** localStorage может быть недоступен (приватный режим) — тогда прогресс живёт только в памяти. */
function readRaw(key: string): StoredProgress | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    return { completed: Array.isArray(parsed.completed) ? parsed.completed : [], current: parsed.current };
  } catch {
    return null;
  }
}

/** Прогресс урока (с влитым старым прогрессом ДЗ, если он был). */
export function readProgress(key: string): StoredProgress {
  const main = readRaw(key) ?? { completed: [] };
  const legacyKey = legacyHomeworkKey(key);
  const legacy = legacyKey ? readRaw(legacyKey) : null;
  if (!legacy) return main;
  return { ...main, completed: [...new Set([...main.completed, ...legacy.completed])] };
}

export function writeProgress(key: string, progress: StoredProgress): void {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
    // Старый прогресс ДЗ уже влит в progress (см. readProgress).
    const legacyKey = legacyHomeworkKey(key);
    if (legacyKey) localStorage.removeItem(legacyKey);
  } catch {
    /* не критично */
  }
}

export function clearProgress(key: string): void {
  try {
    localStorage.removeItem(key);
    const legacyKey = legacyHomeworkKey(key);
    if (legacyKey) localStorage.removeItem(legacyKey);
  } catch {
    /* не критично */
  }
}

/** Медальоны, которые ученик уже видел на карте: новые показываем с анимацией один раз. */
const awardsKey = (lessonId: number) => `verbs-first:awards-seen:${lessonId}`;

export function readSeenAwards(lessonId: number): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(awardsKey(lessonId)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function writeSeenAwards(lessonId: number, stageIds: readonly string[]): void {
  try {
    localStorage.setItem(awardsKey(lessonId), JSON.stringify(stageIds));
  } catch {
    /* не критично */
  }
}
