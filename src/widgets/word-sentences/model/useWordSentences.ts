import { useMemo } from 'react';
import { STORY_CHAPTERS, useStoryProgress, WEEK_MATERIAL } from '@/entities/story';
import { analyzePhrase, lookupToken } from '@/features/card-add';
import type { SentenceSource } from '@/features/card-training';
import { studiedMaterial } from '@/features/daily';
import { buildSentenceIndex } from '../lib';

const LEXICON = { analyze: analyzePhrase, lookup: lookupToken };

/**
 * Фразы для карточек — только из пройденного (`studiedMaterial`): куски прочитанных шагов глав и фразы материала
 * недели начатых глав, где все глаголы и времена уже встречались (решение владельца, 2026-11-27).
 */
export function useWordSentences(): SentenceSource {
  const progress = useStoryProgress();
  return useMemo(() => {
    const studied = studiedMaterial(STORY_CHAPTERS, progress, WEEK_MATERIAL, analyzePhrase);
    const chapters = studied.chapters.map((c) => Object.assign({}, c, { sentences: c.sentences.filter((_, i) => studied.read.get(c.id)!.has(i + 1)) }));
    return buildSentenceIndex(chapters, studied.week, LEXICON);
  }, [progress]);
}
