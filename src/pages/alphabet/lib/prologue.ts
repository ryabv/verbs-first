import { READING_COURSE } from '@/entities/alphabet';
import type { LessonStep } from '@/entities/lesson';

/**
 * Пролог «Греческий алфавит» в формате глав (docs/PRODUCT.md § Урок 0): шаги идут подряд, этапы — только заголовки
 * в оглавлении, без медальонов и карты. Необязательное — заметки Анны: она переводчица, история слов — её ремесло.
 */
export const PROLOGUE_STEPS: readonly LessonStep[] = READING_COURSE.steps;

/** Этапы — заголовки групп в оглавлении: с какого шага начинается и как называется. */
export const PROLOGUE_STAGES = READING_COURSE.stages.map((s, i) => ({
  n: i + 1,
  title: s.title,
  first: PROLOGUE_STEPS.find((x) => x.stage === i + 1)?.id,
}));

export interface PrologueNote {
  id: string;
  title: string;
  /** После какого шага показывать: первый шаг этапа ответвления (там вводятся его буквы). */
  after: string | undefined;
  step: LessonStep;
}

/** Заметки Анны — бывшие ответвления курса чтения (по одному рассказу в каждом). */
export const PROLOGUE_NOTES: readonly PrologueNote[] = READING_COURSE.branches.flatMap((b) =>
  b.steps.map((step) => ({ id: b.id, title: step.title, after: PROLOGUE_STEPS.find((x) => x.stage === b.stage)?.id, step })),
);

export const notesAfter = (stepId: string) => PROLOGUE_NOTES.filter((n) => n.after === stepId);

/** Задания, которые засчитываются только по выполнении; остальные шаги — когда открыты (как чтение в главе). */
export const GOAL_KINDS: ReadonlySet<LessonStep['kind']> = new Set(['choice', 'build', 'order', 'exam']);

/** Чип в оглавлении: что за шаг. */
export function kindTag(step: LessonStep): string {
  switch (step.kind) {
    case 'letters':
      return 'буквы';
    case 'syllables':
      return 'слоги';
    case 'ladder':
      return 'чтение';
    case 'text':
      return 'текст';
    case 'rules':
      return 'правила';
    case 'choice':
      return step.listen ? 'на слух' : 'практика';
    case 'build':
      return 'собрать слово';
    case 'order':
      return 'практика';
    case 'exam':
      return 'экзамен';
    default:
      return 'чтение';
  }
}
