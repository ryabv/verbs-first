import { addWord, inDeck, useCards, type DeckRef } from '@/entities/card';
import { Button } from '@/shared/ui/button';

interface WordToAdd {
  greek: string;
  russian: string;
  kind: 'verb' | 'word';
}

interface Props {
  words: readonly WordToAdd[];
  deckFor: (word: WordToAdd) => DeckRef;
  /** Подпись кнопки, например «Слова с ошибками — в карточки». */
  label: string;
}

/** Добавить несколько слов разом (каждое — в свой набор). Уже добавленные не дублируются. */
export function AddWords({ words, deckFor, label }: Props) {
  const { cards } = useCards();
  const missing = words.filter((w) => !inDeck(cards, w.greek, deckFor(w).id));
  if (missing.length === 0) return <span>✓ Слова из ошибок уже в карточках</span>;
  return (
    <Button variant="secondary" onClick={() => missing.forEach((w) => addWord(deckFor(w), w.greek, w.russian))}>
      {label}: {missing.length}
    </Button>
  );
}
