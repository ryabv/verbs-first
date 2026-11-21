import { table } from '@/shared/lib/db';

/** Порог «экзамен сдан», в процентах. */
export const PASS_PERCENT = 80;

export interface ExamResult {
  /** Лучший процент. */
  best: number;
  passed: boolean;
}

/** id экзамена: номер урока или 'alphabet'. */
export type ExamId = number | string;

/** Таблица `exam_results` (schema.ts): лучший результат экзамена; при слиянии — максимум. */
const results = table('exam_results');

export function readExamResult(id: ExamId): ExamResult | null {
  const row = results.get(String(id));
  return row ? { best: row.best, passed: row.passed } : null;
}

/** Сохраняет результат, если он лучше прежнего. Возвращает, был ли это рекорд. */
export function saveExamResult(id: ExamId, percent: number): boolean {
  const prev = readExamResult(id);
  if (prev && prev.best >= percent) return false;
  results.put({ id: String(id), best: percent, passed: percent >= PASS_PERCENT });
  return true;
}
