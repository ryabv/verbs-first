/** Направление тренировки: на каком языке ученик отвечает. */
export type Direction = 'ru-gr' | 'gr-ru';
export const DIRECTIONS: readonly Direction[] = ['ru-gr', 'gr-ru'];

/** Насколько хорошо знаем слово в одном направлении (коробка Лейтнера). */
export interface Srs {
  /** Коробка 0…5: верный ответ +1, ошибка — 0. */
  box: number;
  /** Сколько раз отвечали. 0 — новое слово. */
  seen: number;
  /** Когда повторить (начало дня, мс). Нет — пора (карточки до интервалов). */
  due?: number;
}

/**
 * Одно слово = одна карточка с общим прогрессом, даже если слово лежит в нескольких наборах.
 * Поэтому при тренировке нескольких наборов общее слово не показывается чаще.
 */
export interface Card {
  id: string;
  /** Наборы, в которых лежит слово (минимум один). */
  deckIds: string[];
  greek: string;
  russian: string;
  createdAt: number;
  progress: Record<Direction, Srs>;
}

/** Набор карточек. У наборов из уроков есть lessonId. */
export interface Deck {
  id: string;
  title: string;
  lessonId?: number;
  createdAt: number;
  /** Когда в набор последний раз добавляли слово — для быстрых кнопок «недавние наборы». */
  usedAt?: number;
}

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
