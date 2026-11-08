import { VERBS } from '../data/verbs';
import type { Verb } from '../model/types';

export function getVerb(id: string): Verb | undefined {
  return VERBS[id];
}

export function getVerbs(ids: readonly string[]): Verb[] {
  return ids.map(getVerb).filter((v): v is Verb => Boolean(v));
}
