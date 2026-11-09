/** Порог «экзамен сдан», в процентах. */
export const PASS_PERCENT = 80;

export interface ExamResult {
  /** Лучший процент. */
  best: number;
  passed: boolean;
}

/** id экзамена: номер урока или 'alphabet'. */
export type ExamId = number | string;

const resultKey = (id: ExamId) => `verbs-first:exam:${id}`;

export function readExamResult(id: ExamId): ExamResult | null {
  try {
    const raw = localStorage.getItem(resultKey(id));
    return raw ? (JSON.parse(raw) as ExamResult) : null;
  } catch {
    return null;
  }
}

/** Сохраняет результат, если он лучше прежнего. Возвращает, был ли это рекорд. */
export function saveExamResult(id: ExamId, percent: number): boolean {
  const prev = readExamResult(id);
  if (prev && prev.best >= percent) return false;
  try {
    localStorage.setItem(resultKey(id), JSON.stringify({ best: percent, passed: percent >= PASS_PERCENT }));
  } catch {
    /* приватный режим */
  }
  return true;
}
