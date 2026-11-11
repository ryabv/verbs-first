import type { StoryChapter } from '../model/types';
import { chapter01 } from './chapter-01';

/** Главы по порядку; новая глава — по уроку. */
export const STORY_CHAPTERS: readonly StoryChapter[] = [chapter01];

/** Сколько глав задумано (по числу уроков) — для «скоро» на странице истории. */
export const STORY_PLANNED = 16;

export function getChapter(id: number): StoryChapter | undefined {
  return STORY_CHAPTERS.find((c) => c.id === id);
}
