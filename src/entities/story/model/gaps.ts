import type { StoryChapter, StoryStep } from './types';

/** Пропуски предложения n (с 1): слово и шаг, которому пропуск принадлежит. */
export function sentenceGaps(chapter: StoryChapter, n: number): { word: string; step: StoryStep }[] {
  return chapter.steps.flatMap((step) =>
    step.task?.kind === 'gap' ? step.task.gaps.filter((g) => g.sentence === n).map((g) => ({ word: g.word, step })) : [],
  );
}

/**
 * Предложение для озвучки с пропусками: вместо слов-ответов — пауза, чтобы звук не выдал ответ.
 * «... ...» — самая длинная пауза внутри фразы у синтезатора (~0,4 с; «…» — почти без паузы,
 * точка — обрывает интонацию). Одно и то же — в браузере (какой файл играть) и в pnpm audio.
 */
export function withGaps(greek: string, words: readonly string[]): string {
  if (words.length === 0) return greek;
  const hidden = new Set(words);
  return greek
    .split(/([\p{L}\p{M}]+)/u)
    .map((part) => (hidden.has(part) ? '... ...' : part))
    .join('');
}

/** Все варианты озвучки предложения: каждое сочетание ещё не решённых пропусков (пропуски решаются в любом порядке). */
export function gapVariants(chapter: StoryChapter, n: number): string[] {
  const greek = chapter.sentences[n - 1]!.greek;
  const words = [...new Set(sentenceGaps(chapter, n).map((g) => g.word))];
  const out: string[] = [];
  for (let mask = 1; mask < 1 << words.length; mask++) out.push(withGaps(greek, words.filter((_, i) => mask & (1 << i))));
  return out;
}
