import { READING_COURSE } from '@/entities/alphabet';
import { cardKey, statusOf, type Card } from '@/entities/card';
import { getLesson, getLessonCatalog, type Lesson } from '@/entities/lesson';
import type { LibraryText } from '@/entities/library';
import { analyzePhrase, lookupToken } from '@/features/card-add';
import { readExamResult } from '@/features/exam';
import { progressKey, readProgress } from '@/features/lesson-progress';
import type { TextToken } from '@/entities/verb';

/**
 * «Знакомые» слова: встречались в уроках, которые ученик начал, или учатся в карточках.
 * Сравниваем по словарной форме (βιβλία → το βιβλίο, έφαγα → τρώω).
 */

/** Ключ словарной формы слова; имена и названия (с заглавной) не считаем — их не учат. */
export function lemmaKey(token: TextToken): string | null {
  if (!token.isWord) return null;
  const entry = lookupToken(token);
  if (!entry) return token.key;
  const head = entry.greek.split(/\s+/).at(-1) ?? '';
  if (entry.kind === 'word' && head && head[0] !== head[0]!.toLowerCase()) return null;
  return cardKey(entry.greek);
}

function keysOf(texts: string[]): Set<string> {
  const keys = new Set<string>();
  for (const t of texts) for (const token of analyzePhrase(t)) {
    const k = lemmaKey(token);
    if (k) keys.add(k);
  }
  return keys;
}

/** Весь греческий урока: примеры, фразы, тексты, упражнения, слова, глаголы. */
function lessonGreek(l: Lesson): string[] {
  const out: string[] = [];
  l.grammar.forEach((g) => g.examples?.forEach((e) => out.push(e.greek)));
  l.topic.phrases.forEach((p) => out.push(p.greek));
  l.topic.presentation.sample.forEach((p) => out.push(p.greek));
  l.readings.forEach((r) => r.sentences.forEach((s) => out.push(s.greek)));
  l.vocabulary.forEach((g) => g.words.forEach((w) => out.push(w.greek)));
  for (const s of [...l.steps, ...l.homework]) {
    if (s.kind === 'translate' || s.kind === 'dictation' || s.kind === 'oral') s.items.forEach((i) => out.push(i.greek[0] ?? ''));
    if (s.kind === 'composition') s.composition.sample.forEach((p) => out.push(p.greek));
  }
  return out;
}

function courseGreek(): string[] {
  const out: string[] = [];
  for (const s of READING_COURSE.steps) {
    if (s.kind === 'text') s.sentences.forEach((x) => out.push(x.plain ?? x.greek));
    if (s.kind === 'ladder' || s.kind === 'build') s.words.forEach((w) => out.push(w.plain ?? w.greek));
    if (s.kind === 'letters') s.letters.forEach((x) => out.push(x.example.greek));
  }
  return out;
}

const lessonKeys = new Map<number | 'course', Set<string>>();
const keysFor = (id: number | 'course', texts: () => string[]) => {
  let k = lessonKeys.get(id);
  if (!k) lessonKeys.set(id, (k = keysOf(texts())));
  return k;
};

/** Начатые уроки (и курс чтения) — их слова ученик уже встречал. */
export function knownKeys(cards: readonly Card[]): Set<string> {
  const known = new Set<string>();
  const add = (keys: Set<string>) => keys.forEach((k) => known.add(k));
  if (readProgress(progressKey.reading).completed.length > 0) add(keysFor('course', courseGreek));
  for (const { id, available } of getLessonCatalog()) {
    const lesson = available ? getLesson(id) : undefined;
    if (!lesson) continue;
    const started = readProgress(progressKey.lesson(id)).completed.length > 0 || readExamResult(id)?.passed;
    if (started) add(keysFor(id, () => lessonGreek(lesson)));
  }
  for (const c of cards) {
    if (statusOf(c, 'gr-ru') !== 'new' || statusOf(c, 'ru-gr') !== 'new') known.add(cardKey(c.greek));
  }
  return known;
}

/** Доля знакомых слов в тексте (по всем словам подряд, без имён). */
export function knownShare(text: LibraryText, known: Set<string>): number {
  let total = 0;
  let hit = 0;
  for (const s of text.sentences) for (const token of analyzePhrase(s.greek)) {
    const k = lemmaKey(token);
    if (!k) continue;
    total++;
    if (known.has(k)) hit++;
  }
  return total ? hit / total : 0;
}

/** Незнакомые слова текста словарной формой — для «в карточки». */
export function unknownWords(text: LibraryText, known: Set<string>) {
  const seen = new Map<string, { greek: string; russian: string; kind: 'verb' | 'word' }>();
  for (const s of text.sentences) for (const token of analyzePhrase(s.greek)) {
    const k = lemmaKey(token);
    const entry = lookupToken(token);
    if (!k || !entry || known.has(k) || seen.has(k)) continue;
    seen.set(k, entry);
  }
  return [...seen.values()];
}

/** Минуты чтения: ~ 60 слов в минуту для начинающего, не меньше минуты. */
export function minutesOf(text: LibraryText): number {
  const words = text.sentences.reduce((n, s) => n + (s.greek.match(/[\p{L}]+/gu)?.length ?? 0), 0);
  return Math.max(1, Math.round(words / 60));
}
