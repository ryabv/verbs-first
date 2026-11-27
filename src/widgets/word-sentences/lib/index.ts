import type { StoryChapter, StorySentence, WeekMaterial } from '@/entities/story';
import type { TextToken } from '@/entities/verb';
import type { SentenceSource, WordSentence } from '@/features/card-training';
import { stripAccents } from '@/shared/lib/greek';
import { seededShuffle } from '@/shared/lib/random';

/** Словарь сайта (features/card-add): разбор фразы и словарная форма слова. */
export interface SentenceLexicon {
  analyze(text: string): TextToken[];
  lookup(token: TextToken): { greek: string; russian: string; kind: 'verb' | 'word' } | undefined;
}

interface Occurrence {
  sentence: StorySentence;
  source: string;
  tokens: TextToken[];
  index: number;
}

/** Часть речи для ловушек: глагол, существительное (с артиклем — какого рода), остальное. */
type Kind = 'verb' | 'ο' | 'η' | 'το' | 'other';

interface FormInfo {
  form: string;
  lemma: string;
  kind: Kind;
  /** Время и лица глагола: ловушка — другой глагол в той же форме. */
  verb?: string;
}

const plain = (s: string) => stripAccents(s.toLowerCase());
const SERVICE = /артикль|предлог|частица|союз|местоимение/;
const ARTICLE = /^(ο|η|το) /;
const kindOf = (lemma: string, isVerb: boolean): Kind => (isVerb ? 'verb' : ((ARTICLE.exec(lemma)?.[1] as Kind | undefined) ?? 'other'));
const nounish = (k: Kind) => k === 'ο' || k === 'η' || k === 'το';
const capitalize = (form: string, like: string) => (like[0] !== like[0]!.toLowerCase() ? form[0]!.toUpperCase() + form.slice(1) : form.toLowerCase());

/**
 * Указатель «слово → фразы» по тексту глав и материалу недели (тексты и предложения): всё уже вычитано.
 * Ловушки для пропуска — формы других слов той же части речи: глагол — в том же времени и лице,
 * остальное — с тем же окончанием (тогда ответ не подсказывает грамматика, только смысл).
 */
export function buildSentenceIndex(chapters: readonly StoryChapter[], week: readonly WeekMaterial[], lexicon: SentenceLexicon): SentenceSource {
  const byLemma = new Map<string, Occurrence[]>();
  const forms: FormInfo[] = [];
  const seenSentence = new Set<string>();
  const add = (sentence: StorySentence, source: string) => {
    if (seenSentence.has(sentence.greek)) return;
    seenSentence.add(sentence.greek);
    const tokens = lexicon.analyze(sentence.greek);
    tokens.forEach((t, index) => {
      if (!t.isWord) return;
      const e = lexicon.lookup(t);
      if (!e) return;
      const list = byLemma.get(plain(e.greek)) ?? [];
      // Одна фраза на слово — один раз, даже если слово в ней дважды.
      if (!list.some((o) => o.sentence === sentence)) list.push({ sentence, source, tokens, index });
      byLemma.set(plain(e.greek), list);
      if (!SERVICE.test(e.russian) && !/^[А-ЯЁ]/.test(e.russian)) {
        forms.push({ form: t.text, lemma: e.greek, kind: kindOf(e.greek, e.kind === 'verb'), verb: t.verb ? `${t.verb.tense}:${t.verb.persons.join(',')}` : undefined });
      }
    });
  };
  const ids = new Set(chapters.map((c) => c.id));
  for (const c of chapters) c.sentences.forEach((s) => add(s, `Глава ${c.id}`));
  for (const w of week) {
    if (!ids.has(w.chapter)) continue;
    w.sentences.forEach((s) => add(s, `Глава ${w.chapter}`));
    w.texts.forEach((t) => t.sentences.forEach((s) => add(s, `Глава ${w.chapter} · ${t.title}`)));
  }

  const decoysFor = (o: Occurrence, lemma: string): string[] => {
    const t = o.tokens[o.index]!;
    const target = plain(t.text);
    const kind = kindOf(lemma, t.verb !== undefined);
    const verb = t.verb ? `${t.verb.tense}:${t.verb.persons.join(',')}` : undefined;
    const ending = target.slice(-2);
    // Существительное — среди существительных (лучше того же рода), глагол — среди глаголов (лучше в той же форме).
    const candidates = forms.filter((f) => f.lemma !== lemma && plain(f.form) !== target && (nounish(kind) ? nounish(f.kind) : f.kind === kind));
    const best = candidates.filter((f) => (verb ? f.verb === verb : f.kind === kind && plain(f.form).endsWith(ending)));
    const out = new Map<string, string>();
    // Прочее (наречия, прилагательные…) — только с тем же окончанием: иначе ловушка выдаёт себя (тогда пропуска нет).
    const seed = `${o.sentence.greek}:${lemma}`;
    const same = seededShuffle(candidates.filter((f) => f.kind === kind), `${seed}:kind`);
    const rest = kind === 'other' ? [] : [...same, ...seededShuffle(candidates, `${seed}:any`)];
    for (const f of [...seededShuffle(best, seed), ...rest]) {
      const lemmaKey = f.lemma;
      if (out.has(lemmaKey) || [...out.values()].some((x) => plain(x) === plain(f.form))) continue;
      out.set(lemmaKey, capitalize(f.form, t.text));
      if (out.size === 3) break;
    }
    return [...out.values()];
  };

  const cache = new Map<string, WordSentence[]>();
  return {
    sentencesFor(greek) {
      const hit = cache.get(greek);
      if (hit) return hit;
      const list = (byLemma.get(plain(greek)) ?? []).map(
        (o): WordSentence => ({
          greek: o.sentence.greek,
          russian: o.sentence.russian,
          parts: o.tokens.map((t, i) => (i === o.index ? { text: t.text, target: true } : { text: t.text })),
          form: o.tokens[o.index]!.text,
          decoys: decoysFor(o, greek),
          source: o.source,
        }),
      );
      cache.set(greek, list);
      return list;
    },
  };
}
