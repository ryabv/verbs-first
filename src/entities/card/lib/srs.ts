import type { Card, Direction, Srs } from '../model/types';

/**
 * Простая система Лейтнера без расписания: верный ответ — карточка в следующую коробку,
 * ошибка — в нулевую. В сессию сначала попадают слабые карточки.
 * (Интервалы по датам можно добавить позже — поле box для этого уже есть.)
 */
export const MAX_BOX = 5;
/** С какой коробки слово считается выученным. */
export const LEARNED_BOX = 3;

export const newSrs = (): Srs => ({ box: 0, seen: 0 });

export function schedule(srs: Srs, correct: boolean): Srs {
  return { box: correct ? Math.min(srs.box + 1, MAX_BOX) : 0, seen: srs.seen + 1 };
}

export type CardStatus = 'new' | 'learning' | 'learned';

export function statusOf(card: Card, dir: Direction): CardStatus {
  const srs = card.progress[dir];
  if (srs.seen === 0) return 'new';
  return srs.box >= LEARNED_BOX ? 'learned' : 'learning';
}

/** Карточки на сессию: сначала слабые (меньше коробка), внутри одной коробки — вперемешку. */
export function pickSession(cards: readonly Card[], dir: Direction, limit = 20): Card[] {
  const byBox = shuffle(cards).toSorted((a, b) => a.progress[dir].box - b.progress[dir].box);
  return shuffle(byBox.slice(0, limit));
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
