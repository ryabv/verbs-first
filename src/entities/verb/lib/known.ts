import type { Tense } from '../model/types';
import type { TextToken } from './analyze';

/**
 * Что из глаголов ученик уже встречал: какие времена и какие глаголы — по прочитанному тексту.
 * Материал, где есть глагол или время, которых в прочитанном не было, ученику ещё рано (решение владельца, 2026-11-27).
 */
export interface KnownGrammar {
  tenses: ReadonlySet<Tense>;
  verbs: ReadonlySet<string>;
}

export function knownGrammar(tokens: Iterable<TextToken>): KnownGrammar {
  const tenses = new Set<Tense>();
  const verbs = new Set<string>();
  for (const t of tokens) {
    if (!t.verb) continue;
    tenses.add(t.verb.tense);
    verbs.add(t.verb.verb.id);
  }
  return { tenses, verbs };
}

/** Все глаголы фразы — знакомые и в знакомых временах. */
export function fitsGrammar(tokens: readonly TextToken[], known: KnownGrammar): boolean {
  return tokens.every((t) => !t.verb || (known.tenses.has(t.verb.tense) && known.verbs.has(t.verb.verb.id)));
}
