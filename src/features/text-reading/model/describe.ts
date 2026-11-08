import { RUSSIAN_PRONOUNS, TENSE_LABELS, type VerbMatch } from '@/entities/verb';

/** «γράφω (писать) · прошедшее · мы · с отрицанием» */
export function describeVerb(match: VerbMatch): string {
  const persons = match.persons.map((p) => RUSSIAN_PRONOUNS[p]).join(' / ');
  const parts = [`${match.verb.lemma} — ${match.verb.translation}`, TENSE_LABELS[match.tense].toLowerCase(), persons];
  if (match.negated) parts.push('с отрицанием');
  return parts.join(' · ');
}
