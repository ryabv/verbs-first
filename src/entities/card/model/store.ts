import { useSyncExternalStore } from 'react';
import { cardKey } from '../lib/answers';
import { newSrs, schedule } from '../lib/srs';
import type { Card, CardsState, Deck, Direction, WordInput } from './types';

/**
 * Хранилище карточек: localStorage + подписка для React.
 * Это независимый сервис — уроки только добавляют в него слова.
 * Когда появится бэкенд, меняется только этот файл.
 */

const STORAGE_KEY = 'verbs-first:cards:v1';
export const DEFAULT_DECK_ID = 'my-words';
/** Свой набор по умолчанию: сюда идут слова, у которых нет набора урока. */
export const DEFAULT_DECK: Deck = { id: DEFAULT_DECK_ID, title: 'Мои слова', createdAt: 0 };

const EMPTY: CardsState = { decks: [DEFAULT_DECK], cards: [] };

/** Старый формат: один набор в поле deckId. */
function migrateCard(card: Card & { deckId?: string }): Card {
  if (Array.isArray(card.deckIds)) return card;
  const { deckId, ...rest } = card;
  return { ...rest, deckIds: [deckId ?? DEFAULT_DECK_ID] };
}

function load(): CardsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CardsState>;
    const decks = Array.isArray(parsed.decks) ? parsed.decks : [];
    const cards = Array.isArray(parsed.cards) ? parsed.cards.map(migrateCard) : [];
    return {
      decks: decks.some((d) => d.id === DEFAULT_DECK_ID) ? decks : [DEFAULT_DECK, ...decks],
      cards,
    };
  } catch {
    return EMPTY;
  }
}

let state: CardsState | null = null;
const listeners = new Set<() => void>();

function getState(): CardsState {
  state ??= load();
  return state;
}

function setState(next: CardsState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* приватный режим: карточки живут до перезагрузки */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Другая вкладка изменила карточки — перечитываем.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useCards(): CardsState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY);
}

// ---------- действия ----------

const makeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Набор урока создаётся по первому добавленному слову. */
export function ensureDeck(deck: Omit<Deck, 'createdAt'>): void {
  const s = getState();
  if (s.decks.some((d) => d.id === deck.id)) return;
  setState({ ...s, decks: [...s.decks, { ...deck, createdAt: Date.now() }] });
}

export function createDeck(title: string): Deck {
  const deck: Deck = { id: `deck-${makeId()}`, title: title.trim(), createdAt: Date.now() };
  const s = getState();
  setState({ ...s, decks: [...s.decks, deck] });
  return deck;
}

/** Убирает слово из набора; если других наборов у слова нет — карточка удаляется. */
function withoutDeck(cards: readonly Card[], deckId: string, only?: (c: Card) => boolean): Card[] {
  return cards.flatMap((c) => {
    if (!c.deckIds.includes(deckId) || (only && !only(c))) return [c];
    const deckIds = c.deckIds.filter((id) => id !== deckId);
    return deckIds.length ? [{ ...c, deckIds }] : [];
  });
}

/**
 * Удаляет набор. Слова, которые есть и в других наборах, остаются там (с прогрессом),
 * остальные удаляются. Свой набор по умолчанию не удаляется.
 */
export function removeDeck(deckId: string): void {
  if (deckId === DEFAULT_DECK_ID) return;
  const s = getState();
  setState({ decks: s.decks.filter((d) => d.id !== deckId), cards: withoutDeck(s.cards, deckId) });
}

/**
 * Кладёт слова в набор. Слово, которое уже есть (по греческому без ударений), не дублируется:
 * та же карточка просто попадает и в этот набор. Возвращает, сколько слов добавилось в набор.
 */
export function addCards(deckId: string, words: readonly WordInput[]): number {
  const s = getState();
  const byKey = new Map(s.cards.map((c) => [cardKey(c.greek), c]));
  const linked = new Set<string>();
  const fresh: Card[] = [];
  for (const w of words) {
    const greek = w.greek.trim();
    const russian = w.russian.trim();
    if (!greek || !russian) continue;
    const key = cardKey(greek);
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.deckIds.includes(deckId)) linked.add(existing.id);
      continue;
    }
    const card: Card = {
      id: makeId(),
      deckIds: [deckId],
      greek,
      russian,
      createdAt: Date.now(),
      progress: { 'ru-gr': newSrs(), 'gr-ru': newSrs() },
    };
    byKey.set(key, card);
    fresh.push(card);
  }
  if (!fresh.length && !linked.size) return 0;
  const now = Date.now();
  setState({
    // oxlint-disable-next-line no-map-spread
    decks: s.decks.map((d) => (d.id === deckId ? { ...d, usedAt: now } : d)),
    cards: [
      // oxlint-disable-next-line no-map-spread
      ...s.cards.map((c) => (linked.has(c.id) ? { ...c, deckIds: [...c.deckIds, deckId] } : c)),
      ...fresh,
    ],
  });
  return fresh.length + linked.size;
}

/** Удалить карточку совсем (из всех наборов). */
export function removeCard(cardId: string): void {
  const s = getState();
  setState({ ...s, cards: s.cards.filter((c) => c.id !== cardId) });
}

/** Убрать слово из одного набора (если наборов не останется — карточка удаляется). */
export function removeFromDeck(cardId: string, deckId: string): void {
  const s = getState();
  setState({ ...s, cards: withoutDeck(s.cards, deckId, (c) => c.id === cardId) });
}

/** Слова, лежащие в наборе. */
export function cardsInDeck(cards: readonly Card[], deckId: string): Card[] {
  return cards.filter((c) => c.deckIds.includes(deckId));
}

/** Карточки выбранных наборов — каждое слово один раз, даже если оно в нескольких наборах. */
export function cardsInDecks(cards: readonly Card[], deckIds: readonly string[] | null): Card[] {
  return deckIds === null ? [...cards] : cards.filter((c) => c.deckIds.some((id) => deckIds.includes(id)));
}

export function recordAnswer(cardId: string, dir: Direction, correct: boolean): void {
  const s = getState();
  setState({
    ...s,
    // Неизменяемое обновление: useSyncExternalStore сравнивает ссылки.
    // oxlint-disable-next-line no-map-spread
    cards: s.cards.map((c) =>
      c.id === cardId ? { ...c, progress: { ...c.progress, [dir]: schedule(c.progress[dir], correct) } } : c,
    ),
  });
}

/** Карточка с этим словом, если есть (без учёта ударений). */
export function findCard(cards: readonly Card[], greek: string): Card | undefined {
  const key = cardKey(greek);
  return cards.find((c) => cardKey(c.greek) === key);
}

/** Набор, куда добавлять слово: id + название (+ урок). Создаётся при первом добавлении. */
export type DeckRef = Omit<Deck, 'createdAt'>;

/** Набор урока: «Урок 1 · Глаголы». Один и тот же id везде, где добавляются слова урока. */
export function lessonDeck(lessonId: number, groupId: string, title: string): DeckRef {
  return { id: `lesson-${lessonId}-${groupId}`, title: `Урок ${lessonId} · ${title}`, lessonId };
}

/** Добавить одно слово в набор (набор создаётся, если его нет). */
export function addWord(deck: DeckRef, greek: string, russian: string): void {
  ensureDeck(deck);
  addCards(deck.id, [{ greek, russian }]);
}

/** Наборы, куда недавно добавляли слова (свежие первыми). */
export function recentDecks(decks: readonly Deck[], limit: number): Deck[] {
  return decks
    .filter((d) => d.usedAt !== undefined)
    .toSorted((a, b) => b.usedAt! - a.usedAt!)
    .slice(0, limit);
}

/** Есть ли слово в конкретном наборе. */
export function inDeck(cards: readonly Card[], greek: string, deckId: string): boolean {
  return findCard(cards, greek)?.deckIds.includes(deckId) ?? false;
}

/** Есть ли слово в карточках (для кнопки «Добавить» в уроке). */
export function hasCard(cards: readonly Card[], greek: string): boolean {
  const key = cardKey(greek);
  return cards.some((c) => cardKey(c.greek) === key);
}
