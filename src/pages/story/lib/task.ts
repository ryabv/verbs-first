/** Ключ слова в тексте: «номер предложения:номер токена». */
export const tokenId = (sentence: number, index: number) => `${sentence}:${index}`;

/** Предложение n входит в кусок (шага или задания). */
export function inFragment(part: { sentences: readonly [number, number] }, sentence: number): boolean {
  return sentence >= part.sentences[0] && sentence <= part.sentences[1];
}

/** Перемешать по ключу: тот же вопрос — тот же порядок вариантов при каждом открытии. */
export { seededShuffle as shuffle } from '@/shared/lib/random';
