import { useMemo } from 'react';
import { chapterRank, chapterRead, levelRank, STORY_LEVELS, practiceKey, STORY_CHAPTERS, useStoryProgress, WEEK_MATERIAL, type StoryLevel } from '@/entities/story';
import { analyzePhrase, lookupToken } from '@/features/card-add';
import { buildPool, type DailyLexicon } from '@/features/daily';
import { seededShuffle } from '@/shared/lib/random';

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

/**
 * Уровень ежедневных — из прогресса, без настройки (docs/product/daily.md): уровень медальона последней закреплённой
 * главы. Ничего не закреплено — лёгкий. Это потолок: задания дня — смесь уровней до него (`dayLevels`).
 */
export function useDailyLevel(): StoryLevel {
  const progress = useStoryProgress();
  const last = STORY_CHAPTERS.findLast((c) => chapterRank(c, progress[c.id] ?? {}) >= 1);
  const rank = last ? chapterRank(last, progress[last.id] ?? {}) : 1;
  return STORY_LEVELS[rank - 1]!;
}

/** Доли лёгких, средних и сложных заданий в дне по потолку (решение владельца): большая часть — лёгкие. */
const MIX: Record<StoryLevel, readonly [number, number, number]> = {
  light: [1, 0, 0],
  medium: [0.7, 0.3, 0],
  hard: [0.5, 0.3, 0.2],
};

/**
 * Уровень каждого задания дня: доли — по `MIX`, какие задания строже — по сиду даты (детерминированно: тот же день —
 * те же уровни).
 */
export function dayLevels(date: string, keys: readonly string[], top: StoryLevel): Map<string, StoryLevel> {
  const [, medium, hard] = MIX[top];
  const nHard = Math.round(keys.length * hard);
  const nMedium = Math.round(keys.length * medium);
  return new Map(
    seededShuffle(keys, `levels:${date}`).map((k, i): [string, StoryLevel] => [k, i < nHard ? 'hard' : i < nHard + nMedium ? 'medium' : 'light']),
  );
}

/** Задания закрепления прочитанных глав, ещё не сделанные на этом уровне: сначала глава «сейчас». */
export function useUnpracticed(level: StoryLevel): string[] {
  const progress = useStoryProgress();
  const rank = levelRank(level);
  return STORY_CHAPTERS.filter((c) => chapterRead(progress[c.id] ?? {}))
    .toReversed()
    .flatMap((c) => c.practice.filter((t) => (progress[c.id]?.[practiceKey(t)] ?? 0) < rank).map((t) => `p:${c.id}:${t.id}`));
}
