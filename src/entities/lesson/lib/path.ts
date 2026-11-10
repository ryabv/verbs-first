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

/** Этап на карте урока: точка дорожки и медальон за неё. */
export interface LessonStage {
  id: string;
  section: PathSection;
  /** Порядковый номер на карте, с 1. */
  n: number;
  title: string;
  /** Надпись над названием: «Домашнее задание · 1», «Экзамен». */
  kicker?: string;
  award: string;
  steps: LessonStep[];
}

/**
 * Весь путь урока по этапам: этапы урока (step.stage), части домашнего задания, экзамен.
 * Порядок шагов — как в lessonPath.
 */
export function lessonStages(lesson: Lesson): LessonStage[] {
  const stages: LessonStage[] = [];
  const keyOf = (s: LessonStep) =>
    s.kind === 'exam' ? 'exam' : s.part !== undefined ? `hw-${s.part}` : `stage-${s.stage ?? lesson.stages.length}`;

  for (const step of lessonPath(lesson)) {
    const id = keyOf(step);
    const last = stages[stages.length - 1];
    if (last?.id === id) {
      last.steps.push(step);
      continue;
    }
    const n = stages.length + 1;
    const section = step.kind === 'exam' ? 'exam' : step.part !== undefined ? 'homework' : 'lesson';
    if (section === 'exam') {
      stages.push({ id, section, n, kicker: 'Экзамен', title: step.title, award: `Урок ${lesson.id} сдан`, steps: [step] });
    } else if (section === 'homework') {
      const part = step.part!;
      stages.push({
        id,
        section,
        n,
        kicker: `Домашнее задание · ${part}`,
        title: lesson.homeworkParts[part - 1] ?? `Часть ${part}`,
        award: `Домашнее задание: часть ${part}`,
        steps: [step],
      });
    } else {
      const info = lesson.stages[(step.stage ?? lesson.stages.length) - 1];
      stages.push({ id, section, n, title: info?.title ?? 'Урок', award: info?.award ?? '', steps: [step] });
    }
  }
  return stages;
}

/** Этап, к которому относится шаг. */
export function stageOfStep(stages: readonly LessonStage[], stepId: string): LessonStage | undefined {
  return stages.find((st) => st.steps.some((s) => s.id === stepId));
}
