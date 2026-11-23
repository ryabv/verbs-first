/** Приветствие на Главной — по времени суток, по-гречески с переводом. Слова — в словаре (words.ts). */
export const GREETINGS = [
  { from: 5, greek: 'Καλημέρα!', russian: 'Доброе утро!' },
  { from: 12, greek: 'Καλημέρα!', russian: 'Добрый день!' },
  { from: 17, greek: 'Καλησπέρα!', russian: 'Добрый вечер!' },
  { from: 23, greek: 'Καληνύχτα!', russian: 'Спокойной ночи!' },
] as const;

export function greetingAt(hour: number) {
  // До пяти утра — ещё ночь.
  if (hour < 5) return GREETINGS[3];
  return GREETINGS.findLast((g) => hour >= g.from) ?? GREETINGS[0];
}
