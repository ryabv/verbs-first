import { readSentenceNumbers, type LevelRank, type StoryChapter, type WeekMaterial } from '@/entities/story';
import { fitsGrammar, knownGrammar, type Tense, type TextToken } from '@/entities/verb';

type Levels = Readonly<Record<string, LevelRank>>;

/** Пройденное по шагам: что из глав и материала недели ученику уже по силам. */
export interface StudiedMaterial {
  /** Начатые главы (прочитан хоть один шаг), по порядку. */
  chapters: StoryChapter[];
  /** Номера прочитанных предложений каждой начатой главы. */
  read: Map<number, Set<number>>;
  /** Материал недели начатых глав: только фразы и тексты, где все глаголы и времена уже встречались. */
  week: WeekMaterial[];
  /** Времена, которые ученик уже встречал. */
  tenses: ReadonlySet<Tense>;
}

/**
 * Не по главам, а по прочитанным шагам (решение владельца, 2026-11-27): слова и фразы — из прочитанных кусков,
 * «правила» (какие глаголы и времена знакомы) — тоже из них. Материал недели не размечен по шагам, поэтому фраза
 * идёт в дело, когда её глава начата и всё в ней из глаголов уже встречалось.
 */
export function studiedMaterial(
  chapters: readonly StoryChapter[],
  progress: Readonly<Record<string, Levels>>,
  week: readonly WeekMaterial[],
  analyze: (text: string) => TextToken[],
): StudiedMaterial {
  const read = new Map<number, Set<number>>();
  for (const c of chapters) {
    const numbers = readSentenceNumbers(c, progress[c.id] ?? {});
    if (numbers.size > 0) read.set(c.id, numbers);
  }
  const started = chapters.filter((c) => read.has(c.id));
  const known = knownGrammar(started.flatMap((c) => c.sentences.filter((_, i) => read.get(c.id)!.has(i + 1)).flatMap((s) => analyze(s.greek))));
  const fits = (greek: string) => fitsGrammar(analyze(greek), known);
  const material: WeekMaterial[] = [];
  for (const w of week) {
    if (!read.has(w.chapter)) continue;
    material.push(Object.assign({}, w, { sentences: w.sentences.filter((s) => fits(s.greek)), texts: w.texts.filter((t) => t.sentences.every((s) => fits(s.greek))) }));
  }
  return { chapters: started, read, week: material, tenses: known.tenses };
}
