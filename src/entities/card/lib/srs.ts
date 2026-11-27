import { fsrs, Rating, type Card as FsrsCard } from 'ts-fsrs';
import type { Card, Srs } from '../model/types';

/**
 * Интервальные повторения — FSRS (docs/product/cards.md): по каждому слову модель оценивает, насколько прочно
 * оно держится (стабильность, дни), и назначает повторение на момент, когда вспомнить станет трудно (~90%).
 * Ответ оценивает сама проверка: верно с первого раза — «хорошо», ошибка — «забыл». Счёт — в календарных днях:
 * слово «на завтра» доступно с начала следующего дня.
 */
const scheduler = fsrs({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: false, enable_short_term: false });

/** Ступени слова: знакомство → узнать в фразе → вспомнить в фразе → написать. */
export type Stage = 'intro' | 'recognize' | 'recall' | 'write';
/** С какой стабильности (дни) слово вспоминаем, а не узнаём, и с какой — пишем. */
export const RECALL_FROM = 4;
export const WRITE_FROM = 15;
/** С какой стабильности слово считается выученным. */
export const LEARNED_FROM = 21;

const DAY = 86_400_000;

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

function toFsrs(srs: Srs | undefined, now: number): FsrsCard {
  if (!srs) {
    return { due: new Date(now), stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0 };
  }
  return {
    due: new Date(srs.due),
    stability: srs.stability,
    difficulty: srs.difficulty,
    elapsed_days: srs.last === undefined ? 0 : Math.max(0, Math.round((dayStart(now) - dayStart(srs.last)) / DAY)),
    scheduled_days: srs.scheduled,
    learning_steps: 0,
    reps: srs.reps,
    lapses: srs.lapses,
    state: srs.state,
    last_review: srs.last === undefined ? undefined : new Date(srs.last),
  };
}

/** Новая память о слове после проверки: верно — «хорошо», ошибка — «забыл». */
export function review(srs: Srs | undefined, correct: boolean, now = Date.now()): Srs {
  const { card } = scheduler.next(toFsrs(srs, now), new Date(now), correct ? Rating.Good : Rating.Again);
  const days = Math.max(1, Math.round((dayStart(card.due.getTime()) - dayStart(now)) / DAY));
  return {
    due: addDays(now, days),
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    scheduled: days,
    last: now,
  };
}

/** Какая ступень у слова сейчас: по тому, насколько прочно оно держится. */
export function stageOf(card: Card): Stage {
  if (card.met === undefined) return 'intro';
  const s = card.srs?.stability ?? 0;
  if (!card.srs || s < RECALL_FROM) return 'recognize';
  return s < WRITE_FROM ? 'recall' : 'write';
}

export type CardStatus = 'new' | 'learning' | 'learned';

export function statusOf(card: Card): CardStatus {
  if (!card.srs) return 'new';
  return card.srs.stability >= LEARNED_FROM ? 'learned' : 'learning';
}

/** Пора повторить: слово уже проверяли, и срок наступил. */
export const isDue = (card: Card, now = Date.now()) => card.srs !== undefined && card.srs.due <= now;

/** Познакомились, но ещё не проверили (бросили сессию после знакомства) — тоже пора. */
const isPending = (card: Card) => card.met !== undefined && !card.srs;

export const isLearned = (card: Card) => statusOf(card) === 'learned';

/** Насколько выучен набор, 0…1: выученное — целиком, учится — по стабильности. */
export function learnedShare(cards: readonly Card[]): number {
  if (!cards.length) return 0;
  const sum = cards.reduce((n, c) => n + Math.min(1, (c.srs?.stability ?? 0) / LEARNED_FROM), 0);
  return sum / cards.length;
}

/** Сколько новых слов за сессию: больше — трудно запомнить. */
export const NEW_PER_SESSION = 8;
export const SESSION_LIMIT = 20;

export interface Plan {
  /** Слова, которые пора повторить (и начатые знакомством). */
  due: Card[];
  /** Новые слова на эту сессию (не больше NEW_PER_SESSION). */
  fresh: Card[];
  /** Всего новых, ещё не начатых. */
  freshTotal: number;
}

/** Что учить сейчас: сначала то, что пора повторить (давно просроченное и хрупкое — раньше), потом немного новых. */
export function planToday(cards: readonly Card[], now = Date.now()): Plan {
  const due = cards
    .filter((c) => isDue(c, now) || isPending(c))
    .toSorted((a, b) => (a.srs?.due ?? 0) - (b.srs?.due ?? 0) || (a.srs?.stability ?? 0) - (b.srs?.stability ?? 0));
  const allFresh = cards.filter((c) => c.met === undefined).toSorted((a, b) => a.createdAt - b.createdAt);
  return { due, fresh: allFresh.slice(0, NEW_PER_SESSION), freshTotal: allFresh.length };
}

/** Карточки сессии по плану: повторения, затем новые; всего не больше SESSION_LIMIT. Внутри — вперемешку. */
export function pickSession(cards: readonly Card[], now = Date.now()): Card[] {
  const { due, fresh } = planToday(cards, now);
  const picked = due.slice(0, SESSION_LIMIT);
  return shuffle([...picked, ...fresh.slice(0, Math.max(0, SESSION_LIMIT - picked.length))]);
}

/** Дополнительная практика, когда на сегодня всё: самые хрупкие слова, даже если срок не наступил. */
export function pickPractice(cards: readonly Card[]): Card[] {
  const started = cards.filter((c) => c.srs);
  const weak = shuffle(started).toSorted((a, b) => a.srs!.stability - b.srs!.stability);
  return shuffle(weak.slice(0, SESSION_LIMIT));
}

/** Когда следующее повторение и сколько слов: ближайший срок среди ещё не наступивших. */
export function nextReview(cards: readonly Card[], now = Date.now()): { at: number; count: number } | null {
  const upcoming = cards.filter((c) => c.srs && c.srs.due > now);
  if (!upcoming.length) return null;
  const at = Math.min(...upcoming.map((c) => c.srs!.due));
  return { at, count: upcoming.filter((c) => c.srs!.due === at).length };
}

/** Через сколько календарных дней наступит момент t: 0 — сегодня, 1 — завтра. */
export const daysUntil = (t: number, now = Date.now()) => Math.round((dayStart(t) - dayStart(now)) / DAY);

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
