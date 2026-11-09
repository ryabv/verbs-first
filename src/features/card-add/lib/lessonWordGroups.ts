import { cardKey, lessonDeck, type DeckRef } from '@/entities/card';
import type { Lesson, Phrase } from '@/entities/lesson';
import { getVerbs } from '@/entities/verb';

export interface WordGroup {
  /** id набора карточек, куда попадёт группа. */
  deckId: string;
  deckTitle: string;
  title: string;
  words: Phrase[];
}

/** Все новые слова урока по группам: глаголы, слова из данных урока, фразы темы. */
export function lessonWordGroups(lesson: Lesson): WordGroup[] {
  const group = (id: string, title: string, words: Phrase[]): WordGroup => {
    const deck = lessonDeck(lesson.id, id, title);
    return { deckId: deck.id, deckTitle: deck.title, title, words };
  };

  const verbs = getVerbs([...lesson.coreVerbIds, ...lesson.verbIds]).map((v) => ({
    greek: v.lemma,
    russian: v.translation,
  }));

  return [
    group('verbs', 'Глаголы', verbs),
    ...lesson.vocabulary.map((g) => group(g.id, g.title, g.words)),
    group('phrases', lesson.topic.title, lesson.topic.phrases),
  ].filter((g) => g.words.length > 0);
}

/** Наборы урока для слов вне шага «Слова урока»: примеры, фразы, глаголы, прочие слова. */
export function lessonDecks(lesson: Lesson) {
  return {
    verbs: lessonDeck(lesson.id, 'verbs', 'Глаголы'),
    /** Слова из фраз и текстов, которых нет в словаре урока (местоимения, предлоги…). */
    other: lessonDeck(lesson.id, 'other', 'Другие слова'),
    phrases: lessonDeck(lesson.id, 'phrases', lesson.topic.title),
    examples: lessonDeck(lesson.id, 'examples', 'Примеры'),
  };
}

/** Слово, для которого выбираем набор. */
export interface WordForDeck {
  greek: string;
  kind: 'verb' | 'word';
}

export type WordDeckFn = (word: WordForDeck) => DeckRef;

/**
 * Куда класть отдельное слово урока: глагол — в «Глаголы», слово из словаря урока — в набор
 * своей группы («Существительные», «Связки и наречия»), остальное — в «Другие слова».
 */
export function lessonWordDeck(lesson: Lesson): WordDeckFn {
  const decks = lessonDecks(lesson);
  const byWord = new Map<string, DeckRef>();
  for (const g of lesson.vocabulary) {
    const deck = lessonDeck(lesson.id, g.id, g.title);
    for (const w of g.words) byWord.set(cardKey(w.greek), deck);
  }
  return ({ greek, kind }) => (kind === 'verb' ? decks.verbs : (byWord.get(cardKey(greek)) ?? decks.other));
}
