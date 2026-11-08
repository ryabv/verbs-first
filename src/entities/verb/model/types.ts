/** Лица: я, ты, он/она, мы, вы, они. */
export const PERSONS = [0, 1, 2, 3, 4, 5] as const;
export type Person = (typeof PERSONS)[number];

/** Три времени «таблицы умножения». */
export const TENSES = ['past', 'present', 'future'] as const;
export type Tense = (typeof TENSES)[number];

/** Три формы: утверждение, вопрос, отрицание. */
export const SENTENCE_FORMS = ['affirmative', 'question', 'negative'] as const;
export type SentenceForm = (typeof SENTENCE_FORMS)[number];

/** Шесть форм по лицам. Варианты через «/»: «ακούν/ακούνε». */
export type PersonForms = readonly [string, string, string, string, string, string];

export type VerbGroup = 'A' | 'B1' | 'B2' | 'irregular' | 'deponent';

export interface Verb {
  id: string;
  lemma: string;
  translation: string;
  group: VerbGroup;
  greek: {
    present: PersonForms;
    /** Аорист (для είμαι/έχω — длительное прошедшее). */
    past: PersonForms;
    /** Совершенная основа: после θα (будущее) и να (с урока 4). */
    perfective: PersonForms;
  };
  russian: {
    present: PersonForms;
    past: PersonForms;
    future: PersonForms;
  };
  /** Короткая подсказка, как образуется прошедшее. */
  pastHint?: string;
}

export interface Cell {
  tense: Tense;
  form: SentenceForm;
  person: Person;
}
