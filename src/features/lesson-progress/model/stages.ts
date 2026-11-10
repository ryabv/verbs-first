import type { LessonStage } from '@/entities/lesson';

/** Этап пройден, когда пройдены все его шаги. */
export function isStageDone(stage: LessonStage, isDone: (stepId: string) => boolean): boolean {
  return stage.steps.every((s) => isDone(s.id));
}

/** Сколько шагов этапа пройдено. */
export function stageDoneCount(stage: LessonStage, isDone: (stepId: string) => boolean): number {
  return stage.steps.filter((s) => isDone(s.id)).length;
}

/** Куда вести при открытии этапа: на первый непройденный шаг, иначе на первый. */
export function stageEntryStep(stage: LessonStage, isDone: (stepId: string) => boolean): string {
  return (stage.steps.find((s) => !isDone(s.id)) ?? stage.steps[0]!).id;
}

/** «Шаг пройден» с учётом экзамена: он засчитан, только если сдан (а не по отметке в прогрессе). */
export function doneWithExam(
  stages: readonly LessonStage[],
  isDone: (stepId: string) => boolean,
  examPassed: boolean,
): (stepId: string) => boolean {
  const examIds = new Set(stages.flatMap((st) => st.steps.filter((s) => s.kind === 'exam').map((s) => s.id)));
  return (id) => (examIds.has(id) ? examPassed : isDone(id));
}
