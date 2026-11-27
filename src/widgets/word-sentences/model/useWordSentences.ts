import { useMemo } from 'react';
import { chapterOpen, STORY_CHAPTERS, useStoryProgress, WEEK_MATERIAL } from '@/entities/story';
import { analyzePhrase, lookupToken } from '@/features/card-add';
import type { SentenceSource } from '@/features/card-training';
import { buildSentenceIndex } from '../lib';

const LEXICON = { analyze: analyzePhrase, lookup: lookupToken };

/** Фразы для карточек — из открытых ученику глав: в них только пройденная грамматика. */
export function useWordSentences(): SentenceSource {
  const progress = useStoryProgress();
  const open = STORY_CHAPTERS.filter((c) => chapterOpen(c, STORY_CHAPTERS, progress))
    .map((c) => c.id)
    .join(',');
  return useMemo(() => {
    const ids = new Set(open.split(',').map(Number));
    return buildSentenceIndex(
      STORY_CHAPTERS.filter((c) => ids.has(c.id)),
      WEEK_MATERIAL,
      LEXICON,
    );
  }, [open]);
}
