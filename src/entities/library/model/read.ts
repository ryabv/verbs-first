import { useSyncExternalStore } from 'react';
import { table, type DbRecord } from '@/shared/lib/db';

/** Прочитанные тексты — таблица `texts_read` (IndexedDB, схема сервера): запись = текст прочитан, снятая отметка — надгробие. */
const rows = table('texts_read');

let built: { from: readonly DbRecord[]; ids: readonly string[] } | null = null;

function snapshot(): readonly string[] {
  const all = rows.all();
  if (built?.from !== all) built = { from: all, ids: all.map((r) => r.id) };
  return built.ids;
}

export function setTextRead(id: string, read: boolean): void {
  if (read) {
    if (!rows.get(id)) rows.put({ id });
  } else rows.remove(id);
}

/** Список прочитанных текстов (реактивно). */
export function useReadTexts(): readonly string[] {
  return useSyncExternalStore(rows.subscribe, snapshot, snapshot);
}
