import type { GrammarTopic } from '../model/types';
import { article } from './article';
import { noun } from './noun';
import { adjective, preposition, pronoun, question } from './other';
import { verb } from './verb';

/** Темы справочника — в порядке, в каком их удобно читать. */
export const GRAMMAR_TOPICS: readonly GrammarTopic[] = [verb, article, noun, adjective, pronoun, preposition, question];

export const getGrammarTopic = (id: string) => GRAMMAR_TOPICS.find((t) => t.id === id);
