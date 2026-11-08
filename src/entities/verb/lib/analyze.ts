import { stripAccents } from '@/shared/lib/greek';
import type { Person, Tense, Verb } from '../model/types';

/**
 * Разбор форм в произвольном тексте по известным парадигмам.
 * «θα + совершенная основа» → будущее, «δεν» перед глаголом (или перед θα) → отрицание.
 */

type Stem = 'present' | 'past' | 'perfective';

interface IndexEntry {
  verb: Verb;
  stem: Stem;
  person: Person;
}

export interface VerbMatch {
  verb: Verb;
  tense: Tense;
  /** Несколько лиц, если форма совпадает (είναι — он/она и они). */
  persons: Person[];
  negated: boolean;
}

export interface TextToken {
  text: string;
  isWord: boolean;
  /** Ключ для словаря: нижний регистр, без ударений. */
  key: string;
  verb?: VerbMatch;
}

const WORD_RE = /[\p{L}\p{M}]+/gu;
const key = (word: string) => stripAccents(word);

function buildIndex(verbs: readonly Verb[]): Map<string, IndexEntry[]> {
  const index = new Map<string, IndexEntry[]>();
  for (const verb of verbs) {
    for (const stem of ['present', 'past', 'perfective'] as const) {
      verb.greek[stem].forEach((raw, person) => {
        for (const form of raw.split('/')) {
          const k = key(form);
          const list = index.get(k) ?? [];
          list.push({ verb, stem, person: person as Person });
          index.set(k, list);
        }
      });
    }
  }
  return index;
}

function tokenize(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD_RE)) {
    const start = match.index ?? 0;
    if (start > last) tokens.push({ text: text.slice(last, start), isWord: false, key: '' });
    tokens.push({ text: match[0], isWord: true, key: key(match[0]) });
    last = start + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), isWord: false, key: '' });
  return tokens;
}

function resolve(entries: IndexEntry[], afterTha: boolean): Omit<VerbMatch, 'negated'> | undefined {
  // После θα — будущее (совершенная основа; у είμαι она совпадает с настоящим).
  const wanted: [Stem, Tense][] = afterTha
    ? [['perfective', 'future']]
    : [
        ['present', 'present'],
        ['past', 'past'],
      ];
  for (const [stem, tense] of wanted) {
    const hits = entries.filter((e) => e.stem === stem);
    if (hits.length) {
      return { verb: hits[0]!.verb, tense, persons: [...new Set(hits.map((h) => h.person))] };
    }
  }
  return undefined;
}

/** Создаёт анализатор под набор глаголов (индекс строится один раз). */
export function createAnalyzer(verbs: readonly Verb[]) {
  const index = buildIndex(verbs);

  return function analyze(text: string): TextToken[] {
    const tokens = tokenize(text);
    const words = tokens.filter((t) => t.isWord);
    words.forEach((token, i) => {
      const entries = index.get(token.key);
      if (!entries) return;
      const prev = words[i - 1]?.key;
      const prev2 = words[i - 2]?.key;
      const afterTha = prev === 'θα';
      const match = resolve(entries, afterTha);
      if (!match) return;
      const negated = prev === 'δεν' || (afterTha && prev2 === 'δεν');
      token.verb = { ...match, negated };
    });
    return tokens;
  };
}

export type Analyzer = ReturnType<typeof createAnalyzer>;
