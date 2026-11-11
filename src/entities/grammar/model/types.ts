/**
 * Справочник грамматики: темы → правила. Правило — единица, на которую ссылаются уроки,
 * тексты и окна слов («почему так?»): адрес /grammar/<тема>#<правило>.
 *
 * Разметка текста: **жирный**, `фрагмент` (окончание, основа — не слово); остальной греческий —
 * слова с переводом, поэтому каждое греческое слово должно быть в словаре (pnpm lexicon:check).
 */
/** Название без разметки — для ссылок и списков. */
export const plainTitle = (title: string) => title.replace(/`/g, '');

export interface GrammarRule {
  id: string;
  title: string;
  paragraphs: string[];
  /** Таблица форм: первая строка — заголовки. Ячейки — с той же разметкой. */
  table?: string[][];
  /** Примеры — фразы с озвучкой (pnpm audio). */
  examples?: { greek: string; russian: string }[];
}

export interface GrammarTopic {
  id: string;
  title: string;
  /** Одной фразой: о чём тема. */
  lead: string;
  /** В каких уроках тема разбирается. */
  lessons?: number[];
  rules: GrammarRule[];
}
