import type { Lesson, LessonStep } from '../model/types';

/** Части пути урока: урок → домашнее задание → экзамен. */
export type PathSection = 'lesson' | 'homework' | 'exam';

export function sectionOf(step: LessonStep): PathSection {
  if (step.kind === 'exam') return 'exam';
  return step.part === undefined ? 'lesson' : 'homework';
}

/** Весь путь урока одним списком: шаги урока, затем ДЗ по частям, в конце экзамен. */
export function lessonPath(lesson: Lesson): LessonStep[] {
  const exam = lesson.steps.filter((s) => s.kind === 'exam');
  return [...lesson.steps.filter((s) => s.kind !== 'exam'), ...lesson.homework, ...exam];
}
