import { useMemo } from 'react';
import { chapterRank, chapterRead, levelRank, STORY_LEVELS, practiceKey, STORY_CHAPTERS, useStoryProgress, WEEK_MATERIAL, type StoryLevel } from '@/entities/story';
import { analyzePhrase, lookupToken } from '@/features/card-add';
import { buildPool, type DailyLexicon } from '@/features/daily';

/** Словарь сайта для сборки дня (features/daily получает его отсюда: фичи не импортируют друг друга). */
export const LEXICON: DailyLexicon = { analyze: analyzePhrase, lookup: lookupToken };

/** Задания, доступные ученику: по прочитанным главам (новичку — слова главы 1). */
export function useDailyPool() {
  const progress = useStoryProgress();
  const readIds = STORY_CHAPTERS.filter((c) => chapterRead(progress[c.id] ?? {}))
    .map((c) => c.id)
    .join(',');
  return useMemo(() => {
    const read = STORY_CHAPTERS.filter((c) => readIds.split(',').includes(String(c.id)));
    const pool = buildPool({ chapters: read, week: WEEK_MATERIAL, first: STORY_CHAPTERS[0], lexicon: LEXICON });
    return { read, pool };
  }, [readIds]);
}

/** Задания закрепления прочитанных глав, ещё не сделанные на этом уровне: сначала глава «сейчас». */
/**
 * Уровень ежедневных — из прогресса, без настройки (docs/product/daily.md): уровень медальона последней закреплённой
 * главы. Ничего не закреплено — лёгкий.
 */
export function useDailyLevel(): StoryLevel {
  const progress = useStoryProgress();
  const last = STORY_CHAPTERS.findLast((c) => chapterRank(c, progress[c.id] ?? {}) >= 1);
  const rank = last ? chapterRank(last, progress[last.id] ?? {}) : 1;
  return STORY_LEVELS[rank - 1]!;
}

export function useUnpracticed(level: StoryLevel): string[] {
  const progress = useStoryProgress();
  const rank = levelRank(level);
  return STORY_CHAPTERS.filter((c) => chapterRead(progress[c.id] ?? {}))
    .toReversed()
    .flatMap((c) => c.practice.filter((t) => (progress[c.id]?.[practiceKey(t)] ?? 0) < rank).map((t) => `p:${c.id}:${t.id}`));
}
