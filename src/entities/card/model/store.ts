import { useSyncExternalStore } from 'react';
import { newId, table, type DbRecord, type Fields, type Table } from '@/shared/lib/db';
import { cardKey } from '../lib/answers';
import { addDays, dayKey, newSrs, schedule } from '../lib/srs';
import type { Card, CardsState, Deck, Direction, WordInput } from './types';

/**
 * Хранилище карточек — таблицы `decks`, `cards`, `activity_days` (IndexedDB, схема сервера): запись на набор,
 * на карточку и на день занятий. Это независимый сервис — уроки только добавляют в него слова.
 * Действия ниже собирают новое состояние целиком (как раньше), а `setState` записывает в базу только
 * изменившиеся записи: сравнение по ссылке — состояние неизменяемое.
 */

export const DEFAULT_DECK_ID = 'my-words';
/** Свой набор по умолчанию: сюда идут слова, у которых нет набора урока. */
export const DEFAULT_DECK: Deck = { id: DEFAULT_DECK_ID, title: 'Мои слова', createdAt: 0 };

const EMPTY: CardsState = { decks: [DEFAULT_DECK], cards: [], days: [] };

type Row<T> = T & DbRecord;
const decksTable = table('decks');
const cardsTable = table('cards');
const daysTable = table('activity_days');

/** Служебные поля базы — в состоянии они не нужны (иначе каждое чтение давало бы «изменение»). */
function strip<T extends { id: string }>(row: T & Partial<DbRecord>): T {
  const { updatedAt: _u, deletedAt: _d, ...rest } = row;
  return rest as unknown as T;
}

let built: { decks: readonly unknown[]; cards: readonly unknown[]; days: readonly unknown[]; state: CardsState } | null = null;

function getState(): CardsState {
  const d = decksTable.all();
  const c = cardsTable.all();
  const y = daysTable.all();
  if (built && built.decks === d && built.cards === c && built.days === y) return built.state;
  const decks = d.map((x) => strip<Deck>(x));
  const state: CardsState = {
    decks: decks.some((x) => x.id === DEFAULT_DECK_ID) ? decks : [DEFAULT_DECK, ...decks],
    cards: c.map((x) => strip<Card>(x)),
    days: y.map((x) => x.id).toSorted(),
  };
  built = { decks: d, cards: c, days: y, state };
  return state;
}

/** Записать разницу: новые и изменённые записи — put, исчезнувшие — надгробие. */
function sync<T extends { id: string }>(prev: readonly T[], next: readonly T[], t: Table<Row<T>>) {
  const before = new Map(prev.map((x) => [x.id, x]));
  const after = new Set(next.map((x) => x.id));
  const changed = next.filter((x) => before.get(x.id) !== x);
  if (changed.length) t.put(...(changed as Fields<Row<T>>[]));
  const gone = prev.filter((x) => !after.has(x.id)).map((x) => x.id);
  if (gone.length) t.remove(...gone);
}

function setState(next: CardsState) {
  const prev = getState();
  sync(prev.decks, next.decks, decksTable);
  sync(prev.cards, next.cards, cardsTable);
  const days = new Set(prev.days);
  const fresh = next.days.filter((x) => !days.has(x));
  if (fresh.length) daysTable.put(...fresh.map((id) => ({ id })));
}

function subscribe(listener: () => void) {
  const offs = [decksTable.subscribe(listener), cardsTable.subscribe(listener), daysTable.subscribe(listener)];
  return () => offs.forEach((off) => off());
}

export function useCards(): CardsState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY);
}

// ---------- действия ----------

const makeId = newId;

/** Набор урока создаётся по первому добавленному слову. */
export function ensureDeck(deck: Omit<Deck, 'createdAt'>): void {
  const s = getState();
  const existing = s.decks.find((d) => d.id === deck.id);
  // Наборы урока называются по данным урока: переименовали группу — обновим название.
  if (existing) {
    if (existing.lessonId !== undefined && existing.title !== deck.title) {
      // oxlint-disable-next-line no-map-spread
      setState({ ...s, decks: s.decks.map((d) => (d.id === deck.id ? { ...d, title: deck.title } : d)) });
    }
    return;
  }
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
  setState({ ...s, decks: s.decks.filter((d) => d.id !== deckId), cards: withoutDeck(s.cards, deckId) });
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
    ...s,
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

/** Ответ в тренировке: новый срок повторения слова и отметка «сегодня занимался». */
export function recordAnswer(cardId: string, dir: Direction, correct: boolean, now = Date.now()): void {
  const s = getState();
  const today = dayKey(now);
  setState({
    ...s,
    // Неизменяемое обновление: useSyncExternalStore сравнивает ссылки.
    // oxlint-disable-next-line no-map-spread
    cards: s.cards.map((c) =>
      c.id === cardId ? { ...c, progress: { ...c.progress, [dir]: schedule(c.progress[dir], correct, now) } } : c,
    ),
    days: s.days.includes(today) ? s.days : [...s.days, today].slice(-400),
  });
}

/** Исправить слово или перевод. Прогресс сохраняется. */
export function updateCard(cardId: string, patch: WordInput): void {
  const greek = patch.greek.trim();
  const russian = patch.russian.trim();
  if (!greek || !russian) return;
  const s = getState();
  // oxlint-disable-next-line no-map-spread
  setState({ ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, greek, russian } : c)) });
}

/** Переименовать свой набор (наборы уроков называются по уроку). */
export function renameDeck(deckId: string, title: string): void {
  const t = title.trim();
  const s = getState();
  if (!t) return;
  // oxlint-disable-next-line no-map-spread
  setState({ ...s, decks: s.decks.map((d) => (d.id === deckId && d.lessonId === undefined ? { ...d, title: t } : d)) });
}

/** Сколько дней подряд занимались — по сегодня или по вчера (сегодня ещё не поздно). */
export function streakOf(days: readonly string[], now = Date.now()): number {
  const set = new Set(days);
  let t = set.has(dayKey(now)) ? now : addDays(now, -1);
  let n = 0;
  while (set.has(dayKey(t))) {
    n++;
    t = addDays(t, -1);
  }
  return n;
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
