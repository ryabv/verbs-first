import type { Card, Direction, Srs } from '../model/types';

/**
 * Интервальные повторения по коробкам Лейтнера. Верный ответ — в следующую коробку,
 * ошибка — в нулевую. Чем выше коробка, тем реже слово возвращается:
 * коробка 0 — сегодня же, 1 — завтра, 2 — через 2 дня, 3 — через 4, 4 — через 8, 5 — через 16.
 * Срок считается в календарных днях: слово «на завтра» доступно с начала следующего дня.
 */
export const MAX_BOX = 5;
/** С какой коробки слово считается выученным. */
export const LEARNED_BOX = 3;
export const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16] as const;

/** Начало календарного дня (по местному времени). */
export function dayStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Начало дня через n календарных дней (переход на летнее время не сбивает счёт). */
export function addDays(t: number, n: number): number {
  const d = new Date(dayStart(t));
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Ключ дня для серии занятий: 2026-11-10. */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const newSrs = (): Srs => ({ box: 0, seen: 0 });

export function schedule(srs: Srs, correct: boolean, now = Date.now()): Srs {
  const box = correct ? Math.min(srs.box + 1, MAX_BOX) : 0;
  return { box, seen: srs.seen + 1, due: addDays(now, INTERVAL_DAYS[box]!) };
}

export type CardStatus = 'new' | 'learning' | 'learned';

export function statusOf(card: Card, dir: Direction): CardStatus {
  const srs = card.progress[dir];
  if (srs.seen === 0) return 'new';
  return srs.box >= LEARNED_BOX ? 'learned' : 'learning';
}

/** Пора повторить: слово уже учили, и срок наступил. Старые карточки без срока — пора. */
export function isDue(card: Card, dir: Direction, now = Date.now()): boolean {
  const srs = card.progress[dir];
  return srs.seen > 0 && (srs.due ?? 0) <= now;
}

/** Выучено в обе стороны: и узнаю, и вспоминаю. */
/** Пора повторить хотя бы в одну сторону. */
export const isDueAny = (card: Card, now = Date.now()) => isDue(card, 'gr-ru', now) || isDue(card, 'ru-gr', now);

export const isLearned = (card: Card) => statusOf(card, 'gr-ru') === 'learned' && statusOf(card, 'ru-gr') === 'learned';

/** Насколько выучен набор, 0…1: каждое направление каждого слова — половина слова. */
export function learnedShare(cards: readonly Card[]): number {
  if (!cards.length) return 0;
  const halves = cards.reduce(
    (sum, c) => sum + Number(statusOf(c, 'gr-ru') === 'learned') + Number(statusOf(c, 'ru-gr') === 'learned'),
    0,
  );
  return halves / (cards.length * 2);
}

/** Сколько новых слов за сессию: больше — трудно запомнить. */
export const NEW_PER_SESSION = 8;
export const SESSION_LIMIT = 20;

export interface Plan {
  /** Слова, которые пора повторить. */
  due: Card[];
  /** Новые слова на эту сессию (не больше NEW_PER_SESSION). */
  fresh: Card[];
  /** Всего новых, ещё не начатых. */
  freshTotal: number;
}

/** Что учить сейчас: сначала то, что пора повторить (просроченное и слабое — раньше), потом немного новых. */
export function planToday(cards: readonly Card[], dir: Direction, now = Date.now()): Plan {
  const due = cards
    .filter((c) => isDue(c, dir, now))
    .toSorted((a, b) => (a.progress[dir].due ?? 0) - (b.progress[dir].due ?? 0) || a.progress[dir].box - b.progress[dir].box);
  const allFresh = cards.filter((c) => c.progress[dir].seen === 0).toSorted((a, b) => a.createdAt - b.createdAt);
  return { due, fresh: allFresh.slice(0, NEW_PER_SESSION), freshTotal: allFresh.length };
}

/** Карточки сессии по плану: повторения, затем новые; всего не больше SESSION_LIMIT. Внутри — вперемешку. */
export function pickSession(cards: readonly Card[], dir: Direction, now = Date.now()): Card[] {
  const { due, fresh } = planToday(cards, dir, now);
  const picked = due.slice(0, SESSION_LIMIT);
  return shuffle([...picked, ...fresh.slice(0, Math.max(0, SESSION_LIMIT - picked.length))]);
}

/** Дополнительная практика, когда на сегодня всё: самые слабые слова, даже если срок не наступил. */
export function pickPractice(cards: readonly Card[], dir: Direction): Card[] {
  const started = cards.filter((c) => c.progress[dir].seen > 0);
  const byBox = shuffle(started).toSorted((a, b) => a.progress[dir].box - b.progress[dir].box);
  return shuffle(byBox.slice(0, SESSION_LIMIT));
}

/** Когда следующее повторение и сколько слов: ближайший срок среди ещё не наступивших. */
export function nextReview(cards: readonly Card[], dir: Direction, now = Date.now()): { at: number; count: number } | null {
  const upcoming = cards.filter((c) => c.progress[dir].seen > 0 && (c.progress[dir].due ?? 0) > now);
  if (!upcoming.length) return null;
  const at = Math.min(...upcoming.map((c) => c.progress[dir].due!));
  return { at, count: upcoming.filter((c) => c.progress[dir].due === at).length };
}

/** Через сколько календарных дней наступит момент t: 0 — сегодня, 1 — завтра. */
export const daysUntil = (t: number, now = Date.now()) => Math.round((dayStart(t) - dayStart(now)) / 86_400_000);

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
