import type { StoryChapter } from '../model/types';
import { chapter01 } from './chapter-01';
import { chapter02 } from './chapter-02';
import { chapter03 } from './chapter-03';
import { chapter04 } from './chapter-04';

/** Главы по порядку; глава — половина урока, 4 главы — эпоха. */
export const STORY_CHAPTERS: readonly StoryChapter[] = [chapter01, chapter02, chapter03, chapter04];

/** Сколько глав задумано: 8 эпох × 4 главы — для «скоро» на странице истории. */
export const STORY_PLANNED = 32;

export function getChapter(id: number): StoryChapter | undefined {
  return STORY_CHAPTERS.find((c) => c.id === id);
}
