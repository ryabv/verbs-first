import { normalizeGreek, stripAccents } from './normalize';

export type AnswerVerdict = 'correct' | 'accent' | 'wrong';

const SUBJECT_PRONOUNS = ['εγώ', 'εσύ', 'αυτός', 'αυτή', 'αυτό', 'εμείς', 'εσείς', 'αυτοί', 'αυτές', 'αυτά'];

function dropLeadingPronoun(normalized: string): string {
  const [first, ...rest] = normalized.split(' ');
  return first && SUBJECT_PRONOUNS.includes(first) ? rest.join(' ') : normalized;
}

/**
 * Сравнивает ответ ученика с допустимыми вариантами.
 * «Свобода прежде правильности»: ошибка только в ударении — не провал, а подсказка.
 */
export function compareAnswer(answer: string, accepted: readonly string[]): AnswerVerdict {
  const exact = dropLeadingPronoun(normalizeGreek(answer));
  const loose = dropLeadingPronoun(stripAccents(answer));
  if (!exact) return 'wrong';

  // Местоимение-подлежащее необязательно и в ответе, и в эталоне.
  if (accepted.some((variant) => dropLeadingPronoun(normalizeGreek(variant)) === exact)) return 'correct';
  if (accepted.some((variant) => dropLeadingPronoun(stripAccents(variant)) === loose)) return 'accent';
  return 'wrong';
}
