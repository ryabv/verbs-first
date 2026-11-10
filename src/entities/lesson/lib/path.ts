import type { Lesson, LessonStep } from '../model/types';

/** Части пути урока: урок → домашнее задание → экзамен. */
export type PathSection = 'lesson' | 'homework' | 'exam';

export function sectionOf(step: LessonStep): PathSection {
  if (step.kind === 'exam') return 'exam';
  return step.part === undefined ? 'lesson' : 'homework';
}

/**
 * Весь путь урока одним списком: этапы урока, после каждого — части ДЗ по его теме
 * (homeworkParts[].after), в конце экзамен.
 */
export function lessonPath(lesson: Lesson): LessonStep[] {
  const exam = lesson.steps.filter((s) => s.kind === 'exam');
  const main = lesson.steps.filter((s) => s.kind !== 'exam');
  const lastStage = Math.max(0, ...main.map((s) => s.stage ?? 0));
  const homeworkAfter = (stage: number) =>
    lesson.homework.filter((s) => {
      const after = lesson.homeworkParts[(s.part ?? 1) - 1]?.after ?? lastStage;
      return Math.min(after, lastStage) === stage;
    });
  const path: LessonStep[] = [];
  main.forEach((step, i) => {
    path.push(step);
    const stage = step.stage ?? lastStage;
    const next = main[i + 1];
    // Этап закончился — сразу его домашнее задание.
    if (!next || (next.stage ?? lastStage) !== stage) path.push(...homeworkAfter(stage));
  });
  return [...path, ...exam];
}

/** Этап на карте урока: точка дорожки и медальон за неё. Ответвление — тоже «этап», но section 'branch'. */
export interface LessonStage {
  id: string;
  section: PathSection | 'branch';
  /** Порядковый номер на карте, с 1. */
  n: number;
  /** Номер внутри своего вида: этап урока 1…6 (буква медальона), часть ДЗ 1…4; у экзамена 1. */
  num: number;
  title: string;
  /** Надпись над названием: «Домашнее задание · 1», «Экзамен». */
  kicker?: string;
  award: string;
  steps: LessonStep[];
  /** У ответвления — id этапа, от которого оно отходит. */
  parent?: string;
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
      stages.push({ id, section, n, num: 1, kicker: 'Экзамен', title: step.title, award: `Урок ${lesson.id} сдан`, steps: [step] });
    } else if (section === 'homework') {
      const part = step.part!;
      stages.push({
        id,
        section,
        n,
        num: part,
        kicker: `Домашнее задание · ${part}`,
        title: lesson.homeworkParts[part - 1]?.title ?? `Часть ${part}`,
        award: `Часть ${part} выполнена`,
        steps: [step],
      });
    } else {
      const num = step.stage ?? lesson.stages.length;
      const info = lesson.stages[num - 1];
      stages.push({ id, section, n, num, title: info?.title ?? 'Урок', award: info?.award ?? '', steps: [step] });
    }
  }
  return stages;
}

/** Этап, к которому относится шаг. */
export function stageOfStep(stages: readonly LessonStage[], stepId: string): LessonStage | undefined {
  return stages.find((st) => st.steps.some((s) => s.id === stepId));
}

/** Ответвления урока как «этапы» с section 'branch'; n и num — номер родительского этапа урока. */
export function lessonBranches(lesson: Lesson): LessonStage[] {
  return lesson.branches.map((b) => ({
    id: `branch-${b.id}`,
    section: 'branch',
    n: b.stage,
    num: b.stage,
    kicker: 'Ответвление',
    title: b.title,
    award: '',
    steps: b.steps,
    parent: `stage-${b.stage}`,
  }));
}
