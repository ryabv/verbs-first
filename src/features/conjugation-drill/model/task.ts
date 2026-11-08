import {
  buildGreek,
  buildRussian,
  PERSONS,
  SENTENCE_FORMS,
  TENSES,
  type Cell,
  type SentenceForm,
  type Tense,
  type Verb,
} from '@/entities/verb';

/** Какие ячейки таблицы тренируем. Пустые массивы/undefined = все. */
export interface DrillCells {
  tenses?: readonly Tense[];
  forms?: readonly SentenceForm[];
}

export interface DrillTask {
  key: string;
  verb: Verb;
  cell: Cell;
  prompt: string;
  accepted: string[];
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

export function createTask(verb: Verb, cell: Cell): DrillTask {
  return {
    key: `${verb.id}:${cell.tense}:${cell.form}:${cell.person}`,
    verb,
    cell,
    prompt: buildRussian(verb, cell),
    accepted: buildGreek(verb, cell),
  };
}

export function randomTask(verbs: readonly Verb[], cells: DrillCells = {}, exceptKey?: string): DrillTask {
  const tenses = cells.tenses?.length ? cells.tenses : TENSES;
  const forms = cells.forms?.length ? cells.forms : SENTENCE_FORMS;
  let task = createTask(pick(verbs), { tense: pick(tenses), form: pick(forms), person: pick(PERSONS) });
  for (let attempt = 0; attempt < 10 && task.key === exceptKey; attempt++) {
    task = createTask(pick(verbs), { tense: pick(tenses), form: pick(forms), person: pick(PERSONS) });
  }
  return task;
}
