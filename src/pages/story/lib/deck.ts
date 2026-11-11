import type { DeckRef } from '@/entities/card';

/** Слова из истории — в свой набор. */
export const STORY_DECK: DeckRef = { id: 'story', title: 'Из истории' };
export const storyDeck = () => STORY_DECK;
