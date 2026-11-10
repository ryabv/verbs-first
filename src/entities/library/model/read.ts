import { useSyncExternalStore } from 'react';

/** Прочитанные тексты: id в localStorage. Синхронизация между вкладками — через событие storage. */
const KEY = 'verbs-first:texts:read';
const listeners = new Set<() => void>();
let cache: readonly string[] | null = null;

function load(): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function snapshot(): readonly string[] {
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

export function setTextRead(id: string, read: boolean): void {
  const next = read ? [...new Set([...snapshot(), id])] : snapshot().filter((x) => x !== id);
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* приватный режим — живёт в памяти */
  }
  listeners.forEach((l) => l());
}

/** Список прочитанных текстов (реактивно). */
export function useReadTexts(): readonly string[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
