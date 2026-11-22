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

/** Перемешать (Фишер — Йейтс): варианты в данных часто стоят верным первым. */
export function shuffle<T>(xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
