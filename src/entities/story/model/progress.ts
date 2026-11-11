import { useSyncExternalStore } from 'react';

/**
 * Пройденные шаги истории: { [номер главы]: id шагов }. Отдельный id END — дочитана вся глава.
 * localStorage, синхронизация между вкладками — через событие storage.
 */
const KEY = 'verbs-first:story';
export const STORY_END = 'end';

type Progress = Readonly<Record<string, readonly string[]>>;
const listeners = new Set<() => void>();
let cache: Progress | null = null;

function load(): Progress {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string');
    }
    return out;
  } catch {
    return {};
  }
}

function snapshot(): Progress {
  cache ??= load();
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function markStoryStep(chapterId: number, stepId: string): void {
  const current = snapshot()[chapterId] ?? [];
  if (current.includes(stepId)) return;
  const next = { ...snapshot(), [chapterId]: [...current, stepId] };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* приватный режим — живёт в памяти */
  }
  listeners.forEach((l) => l());
}

const EMPTY: readonly string[] = [];

/** Пройденные шаги главы (реактивно). */
export function useStoryDone(chapterId: number): readonly string[] {
  const progress = useSyncExternalStore(subscribe, snapshot, snapshot);
  return progress[chapterId] ?? EMPTY;
}
