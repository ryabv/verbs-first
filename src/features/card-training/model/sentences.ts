/**
 * Фразы со словом карточки — из глав и материала недели (собирает `widgets/word-sentences`: фичи не импортируют
 * друг друга, а словарь сайта — в features/card-add). Слово каждый раз — в другой фразе: учим словоупотребление,
 * а не одну фразу наизусть (docs/product/cards.md).
 */
export interface WordSentence {
  /** Греческий текст фразы — он же ключ: показанные фразы запоминаются в карточке. */
  greek: string;
  russian: string;
  /** Фраза по кусочкам (слова, пробелы, знаки); слово карточки — `target`. */
  parts: readonly { text: string; target?: boolean }[];
  /** Форма слова во фразе — ответ в пропуске. */
  form: string;
  /** Другие слова в похожей форме — ловушки для пропуска (3 штуки, если нашлись). */
  decoys: readonly string[];
  /** Откуда фраза: «Глава 2». */
  source: string;
}

export interface SentenceSource {
  /** Фразы, где встречается слово (словарная форма, как в карточке). */
  sentencesFor(greek: string): readonly WordSentence[];
}

/** Без фраз: слово тренируется само по себе. */
export const NO_SENTENCES: SentenceSource = { sentencesFor: () => [] };

/** Следующая фраза: ещё не показанная (из недавних), иначе — показанная давнее всех. */
export function pickSentence(list: readonly WordSentence[], shown: readonly string[] = [], skip: readonly string[] = []): WordSentence | undefined {
  const pool = list.filter((s) => !skip.includes(s.greek));
  const fresh = pool.filter((s) => !shown.includes(s.greek));
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  return pool.toSorted((a, b) => shown.indexOf(b.greek) - shown.indexOf(a.greek))[0];
}
