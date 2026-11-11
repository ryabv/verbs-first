import type { StoryStep } from '@/entities/story';
import type { TextToken } from '@/entities/verb';
import { stripAccents } from '@/shared/lib/greek';

/** Ключ слова в тексте: «номер предложения:номер токена». */
export const tokenId = (sentence: number, index: number) => `${sentence}:${index}`;

export function inFragment(step: StoryStep, sentence: number): boolean {
  return sentence >= step.sentences[0] && sentence <= step.sentences[1];
}

/** Это слово — пропуск задачи? Возвращает номер пропуска. */
export function gapIndex(step: StoryStep, sentence: number, token: TextToken): number {
  if (step.task?.kind !== 'gap') return -1;
  return step.task.gaps.findIndex((g) => g.sentence === sentence && g.word === token.text);
}

const norm = (xs: readonly string[]) => xs.map((x) => stripAccents(x)).toSorted().join(' ');

/** Выбранные слова совпадают с ответом (без учёта ударений и регистра, порядок неважен). */
export function tapCorrect(picked: readonly string[], answer: readonly string[]): boolean {
  return norm(picked) === norm(answer);
}
