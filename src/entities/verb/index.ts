export type { Verb, Person, Tense, SentenceForm, Cell, PersonForms } from './model/types';
export { PERSONS, TENSES, SENTENCE_FORMS } from './model/types';
export { GREEK_PRONOUNS, RUSSIAN_PRONOUNS, TENSE_LABELS, FORM_LABELS } from './model/labels';
export { buildGreek, buildRussian } from './lib/buildPhrase';
export { getVerb, getVerbs } from './lib/getVerbs';
export { createAnalyzer, type Analyzer, type TextToken, type VerbMatch } from './lib/analyze';
export { VerbTable } from './ui/VerbTable';
export { VerbParadigm } from './ui/VerbParadigm';
export { PersonSwitcher } from './ui/PersonSwitcher';
