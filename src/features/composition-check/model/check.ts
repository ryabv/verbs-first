import type { CompositionCheck } from '@/entities/lesson';
import { TENSE_LABELS, type Analyzer } from '@/entities/verb';

export interface CheckResult {
  label: string;
  ok: boolean;
  /** Что именно засчитано: «μαγείρεψα». */
  evidence?: string;
}

function countSentences(text: string): number {
  return text.split(/[.!;;?…]+/).filter((part) => /\p{L}/u.test(part)).length;
}

export function runChecks(text: string, checks: readonly CompositionCheck[], analyze: Analyzer): CheckResult[] {
  const tokens = analyze(text);
  const verbs = tokens.filter((t) => t.verb);

  return checks.map((check): CheckResult => {
    switch (check.kind) {
      case 'sentences': {
        const n = countSentences(text);
        return { label: `Не меньше ${check.min} предложений (сейчас ${n})`, ok: n >= check.min };
      }
      case 'tense': {
        const hit = verbs.find((t) => t.verb?.tense === check.tense);
        return {
          label: `${TENSE_LABELS[check.tense]} время`,
          ok: Boolean(hit),
          evidence: hit && (check.tense === 'future' ? `θα ${hit.text}` : hit.text),
        };
      }
      case 'negative': {
        const hit = verbs.find((t) => t.verb?.negated);
        const anyDen = tokens.some((t) => t.key === 'δεν');
        return {
          label: 'Отрицание с δεν',
          ok: Boolean(hit) || anyDen,
          evidence: hit ? `δεν … ${hit.text}` : undefined,
        };
      }
      case 'question':
        return { label: 'Вопрос (в конце знак «;»)', ok: /\p{L}[^.!]*[;;?]/u.test(text) };
    }
  });
}
