import { stripAccents } from '@/shared/lib/greek';

const norm = (xs: readonly string[]) => xs.map((x) => stripAccents(x)).toSorted().join(' ');

/** Выбранные слова совпадают с ответом (без учёта ударений и регистра, порядок неважен). */
export function tapCorrect(picked: readonly string[], answer: readonly string[]): boolean {
  return norm(picked) === norm(answer);
}

/** Плитки фразы: слова без знаков препинания (знаки дописываются при проверке). */
export function tilesOf(phrase: string): string[] {
  return phrase.match(/[\p{L}\p{M}]+/gu) ?? [];
}

/**
 * Перемешать по ключу задания: в данных верный вариант часто первый, а порядок показа
 * должен быть одним и тем же при каждом открытии.
 */
export { seededShuffle as shuffle } from '@/shared/lib/random';
