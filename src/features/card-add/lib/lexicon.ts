import { COMBINATIONS, LETTERS, STRESS_EXAMPLES } from '@/entities/alphabet';
import { DICTIONARY } from '@/entities/dictionary';
import { getLesson, getLessonCatalog, type Lesson } from '@/entities/lesson';
import { createAnalyzer, getVerbs, type TextToken } from '@/entities/verb';
import { stripAccents } from '@/shared/lib/greek';

/** Что кладём в карточку, когда нажали слово во фразе или тексте. */
export interface LexEntry {
  /** Словарная форма: глагол — начальная, существительное — с артиклем. */
  greek: string;
  russian: string;
  kind: 'verb' | 'word';
}

const ARTICLES = new Set(['ο', 'η', 'το', 'οι', 'τα', 'τον', 'την', 'τη', 'τους', 'τις']);
const WORD_RE = /[\p{L}\p{M}]+/gu;

/** Ключи, по которым ищем запись: «το βιβλίο» → βιβλιο; одно слово → само слово. */
function headKeys(greek: string): string[] {
  const words = greek.match(WORD_RE) ?? [];
  if (words.length === 1) return [stripAccents(words[0]!)];
  if (words.length === 2 && ARTICLES.has(stripAccents(words[0]!))) return [stripAccents(words[1]!)];
  return [];
}

interface Lexicon {
  words: Map<string, LexEntry>;
  /** Значения из словариков текстов: ключ → перевод (форма — как в тексте). */
  glosses: Map<string, string>;
  analyze: ReturnType<typeof createAnalyzer>;
}

let cache: Lexicon | null = null;

/** Общий словарь сайта собирается один раз из данных уроков, глаголов, алфавита и словаря. */
function lexicon(): Lexicon {
  if (cache) return cache;
  const words = new Map<string, LexEntry>();
  const glosses = new Map<string, string>();
  const put = (key: string, entry: LexEntry) => {
    if (key && !words.has(key)) words.set(key, entry);
  };
  const putPhrase = (greek: string, russian: string) =>
    headKeys(greek).forEach((k) => put(k, { greek, russian, kind: 'word' }));

  const lessons = getLessonCatalog()
    .map((c) => getLesson(c.id))
    .filter((l): l is Lesson => l !== undefined);
  const verbIds = new Set(lessons.flatMap((l) => [...l.coreVerbIds, ...l.verbIds]));

  // Порядок = приоритет: слова уроков, затем общий словарь, затем примеры.
  for (const l of lessons) l.vocabulary.forEach((g) => g.words.forEach((w) => putPhrase(w.greek, w.russian)));
  for (const e of DICTIONARY) {
    const entry: LexEntry = { greek: e.greek, russian: e.russian, kind: 'word' };
    headKeys(e.greek).forEach((k) => put(k, entry));
    e.forms?.forEach((f) => put(stripAccents(f), entry));
  }
  for (const l of lessons) l.topic.phrases.forEach((p) => putPhrase(p.greek, p.russian));
  for (const letter of LETTERS) putPhrase(letter.example.greek, letter.example.russian);
  for (const c of COMBINATIONS) c.examples.forEach((e) => putPhrase(e.greek, e.russian));
  for (const e of Object.values(STRESS_EXAMPLES)) putPhrase(e.greek, e.russian);
  for (const l of lessons) {
    for (const r of l.readings) {
      for (const [k, v] of Object.entries(r.glossary)) if (!glosses.has(k)) glosses.set(k, v);
    }
  }

  cache = { words, glosses, analyze: createAnalyzer(getVerbs([...verbIds])) };
  return cache;
}

/** Разбор фразы на слова; формы глаголов распознаются (с учётом θα / δεν). */
export function analyzePhrase(text: string): TextToken[] {
  return lexicon().analyze(text);
}

/**
 * Словарная форма слова для карточки: глагол — начальная форма, существительное — именительный
 * падеж ед. ч. с артиклем. Формы из текста («βιβλία», «στην») ведут к словарной форме через явные
 * формы в словаре; если её нет — undefined (в карточку форму из текста не кладём).
 */
export function lookupToken(token: TextToken): LexEntry | undefined {
  if (token.verb) return { greek: token.verb.verb.lemma, russian: token.verb.verb.translation, kind: 'verb' };
  return lexicon().words.get(token.key);
}

/** Значение формы из словарика текста — подсказка, когда словарной формы нет. */
export function glossHint(token: TextToken): string | undefined {
  return lexicon().glosses.get(token.key);
}
