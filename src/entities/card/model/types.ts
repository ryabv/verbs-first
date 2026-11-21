import type { Schema, SrsFields } from '@/shared/lib/db';

/** Направление тренировки: на каком языке ученик отвечает. */
export type Direction = 'ru-gr' | 'gr-ru';
export const DIRECTIONS: readonly Direction[] = ['ru-gr', 'gr-ru'];

/** Насколько хорошо знаем слово в одном направлении (коробка Лейтнера). Поля — схема базы. */
export type Srs = SrsFields;

/**
 * Одно слово = одна карточка с общим прогрессом, даже если слово лежит в нескольких наборах.
 * Поля — таблица `cards` (shared/lib/db/schema.ts).
 */
export type Card = { id: string } & Schema['cards'];

/** Набор карточек. У наборов из уроков есть lessonId. Поля — таблица `decks`. */
export type Deck = { id: string } & Schema['decks'];

/** Слово до добавления в карточки. */
export interface WordInput {
  greek: string;
  russian: string;
}

export interface CardsState {
  decks: Deck[];
  cards: Card[];
  /** Дни, когда занимались карточками (2026-11-10), — для серии дней подряд. */
  days: string[];
}
