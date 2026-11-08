import { buildCatalog } from '../data/catalog';
import { lesson01 } from '../data/lesson-01';
import type { Lesson, LessonCatalogItem } from '../model/types';

/**
 * Пока контент лежит в бандле. Когда появится бэкенд/CMS,
 * меняется только этот файл — сигнатуры остаются.
 */
const LESSONS: Record<number, Lesson> = { 1: lesson01 };

export function getLesson(id: number): Lesson | undefined {
  return LESSONS[id];
}

export function getLessonCatalog(): LessonCatalogItem[] {
  return buildCatalog(
    new Map(Object.values(LESSONS).map((l) => [l.id, { steps: l.steps.length, homework: l.homework.length }])),
  );
}
