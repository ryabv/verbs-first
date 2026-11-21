import { table } from '@/shared/lib/db';

export interface StoredProgress {
  completed: string[];
  current?: string;
}

/**
 * Прогресс урока — таблица `lesson_progress` (IndexedDB, схема сервера): запись на урок или курс чтения,
 * пройденные шаги и текущий шаг. При слиянии устройств пройденные шаги объединяются.
 */
/** Ключ (id записи) прогресса урока: урок, ДЗ и экзамен — один путь. */
export const progressKey = {
  lesson: (lessonId: number) => `lesson:${lessonId}`,
  /** Курс чтения («Урок 0»): этапы алфавита на карте. */
  reading: 'reading',
};

const lessons = table('lesson_progress');

export function readProgress(key: string): StoredProgress {
  const row = lessons.get(key);
  return row ? { completed: row.completed, current: row.current } : { completed: [] };
}

export function writeProgress(key: string, progress: StoredProgress): void {
  lessons.put({ id: key, completed: progress.completed, current: progress.current });
}

export function clearProgress(key: string): void {
  lessons.remove(key);
}

/**
 * Медальоны, которые ученик уже видел на карте: новые показываем с анимацией один раз.
 * Таблица `awards`: запись на урок, `seen` — этапы, чей медальон показан.
 */
const awards = table('awards');
const awardsKey = (lessonId: number | string) => `lesson:${lessonId}`;

export function readSeenAwards(lessonId: number | string): string[] {
  return awards.get(awardsKey(lessonId))?.seen ?? [];
}

export function writeSeenAwards(lessonId: number | string, stageIds: readonly string[]): void {
  awards.put({ id: awardsKey(lessonId), seen: [...stageIds] });
}
