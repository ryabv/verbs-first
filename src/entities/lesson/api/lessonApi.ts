import { buildCatalog } from '../data/catalog';
import { lesson01 } from '../data/lesson-01';
import { lesson02 } from '../data/lesson-02';
import { lessonPath } from '../lib/path';
import type { Lesson, LessonCatalogItem } from '../model/types';

/**
 * Пока контент лежит в бандле. Когда появится бэкенд/CMS,
 * меняется только этот файл — сигнатуры остаются.
 */
const LESSONS: Record<number, Lesson> = { 1: lesson01, 2: lesson02 };

export function getLesson(id: number): Lesson | undefined {
  return LESSONS[id];
}

export function getLessonCatalog(): LessonCatalogItem[] {
  return buildCatalog(
    new Map(Object.values(LESSONS).map((l) => [l.id, lessonPath(l).length])),
  );
}

/**
 * Глаголы, которые ученик уже знает к этому уроку: опорные и глаголы этого и всех прошлых уроков.
 * Тексты и сочинения опираются на всё пройденное, поэтому разбор форм — по ним.
 */
export function knownVerbIds(lesson: Lesson): string[] {
  const ids = new Set([...lesson.coreVerbIds, ...lesson.verbIds]);
  for (const l of Object.values(LESSONS)) {
    if (l.id > lesson.id) continue;
    for (const id of l.coreVerbIds) ids.add(id);
    for (const id of l.verbIds) ids.add(id);
  }
  return [...ids];
}
