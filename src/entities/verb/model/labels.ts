import type { Person, SentenceForm, Tense } from './types';

export const GREEK_PRONOUNS: Record<Person, string> = {
  0: 'εγώ', 1: 'εσύ', 2: 'αυτός / αυτή', 3: 'εμείς', 4: 'εσείς', 5: 'αυτοί',
};

export const RUSSIAN_PRONOUNS: Record<Person, string> = {
  0: 'я', 1: 'ты', 2: 'он / она', 3: 'мы', 4: 'вы', 5: 'они',
};

export const TENSE_LABELS: Record<Tense, string> = {
  past: 'Прошедшее', present: 'Настоящее', future: 'Будущее',
};

export const FORM_LABELS: Record<SentenceForm, string> = {
  affirmative: 'Утверждение', question: 'Вопрос', negative: 'Отрицание',
};

export const FORM_SIGNS: Record<SentenceForm, string> = {
  affirmative: '+', question: '?', negative: '–',
};
