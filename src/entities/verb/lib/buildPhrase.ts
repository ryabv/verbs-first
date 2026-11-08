import { capitalize } from '@/shared/lib/greek';
import { RUSSIAN_PRONOUNS } from '../model/labels';
import type { Cell, Verb } from '../model/types';

function variants(raw: string): string[] {
  return raw.split('/').map((v) => v.trim());
}

/** Греческий глагол в ячейке без знаков: «θα γράψω». Местоимение опускается — как в живой речи. */
function greekCore(verb: Verb, { tense, person }: Cell): string[] {
  if (tense === 'future') return variants(verb.greek.perfective[person]).map((f) => `θα ${f}`);
  return variants(verb.greek[tense][person]);
}

/** Все допустимые варианты фразы для ячейки. Первый — основной (для показа). */
export function buildGreek(verb: Verb, cell: Cell): string[] {
  return greekCore(verb, cell).map((core) => {
    if (cell.form === 'negative') return capitalize(`δεν ${core}`);
    if (cell.form === 'question') return `${capitalize(core)};`;
    return capitalize(core);
  });
}

/** Русская фраза-задание: «Ты не напишешь». */
export function buildRussian(verb: Verb, { tense, form, person }: Cell): string {
  const pronoun = RUSSIAN_PRONOUNS[person];
  const verbForm = verb.russian[tense][person];
  const core = form === 'negative' ? `${pronoun} не ${verbForm}` : `${pronoun} ${verbForm}`;
  return capitalize(core) + (form === 'question' ? '?' : '');
}
