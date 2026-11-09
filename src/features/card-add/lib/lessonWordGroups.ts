import { lessonDeck } from '@/entities/card';
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

/** Наборы урока для слов вне шага «Слова урока»: примеры, фразы, глаголы, слова текстов. */
export function lessonDecks(lesson: Lesson) {
  return {
    verbs: lessonDeck(lesson.id, 'verbs', 'Глаголы'),
    text: lessonDeck(lesson.id, 'text', 'Слова'),
    phrases: lessonDeck(lesson.id, 'phrases', lesson.topic.title),
    examples: lessonDeck(lesson.id, 'examples', 'Примеры'),
  };
}

/** Куда класть отдельные слова из фраз и текстов урока: глаголы — в «Глаголы», остальное — в «Слова». */
export function lessonWordDeck(lesson: Lesson) {
  const decks = lessonDecks(lesson);
  return (kind: 'verb' | 'word') => (kind === 'verb' ? decks.verbs : decks.text);
}
