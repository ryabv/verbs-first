/**
 * Какие слова на сайте нельзя добавить в карточки словарной формой.
 * Запуск: pnpm lexicon:check. Непокрытые слова — дописать в src/entities/dictionary/data/words.ts.
 */
import { COMBINATIONS, LETTERS, READING_COURSE, STRESS_EXAMPLES } from '@/entities/alphabet';
import { getLesson, getLessonCatalog, type Lesson } from '@/entities/lesson';
import { LIBRARY_TEXTS } from '@/entities/library';
import { analyzePhrase, lookupToken } from '@/features/card-add/lib/lexicon';

const texts: string[] = [];
const lessons = getLessonCatalog()
  .map((c) => getLesson(c.id))
  .filter((l): l is Lesson => l !== undefined);
for (const l of lessons) {
  l.grammar.forEach((g) => g.examples?.forEach((e) => texts.push(e.greek)));
  l.topic.phrases.forEach((p) => texts.push(p.greek));
  l.topic.presentation.sample.forEach((p) => texts.push(p.greek));
  l.readings.forEach((r) => r.sentences.forEach((s) => texts.push(s.greek)));
  [...l.steps, ...l.homework, ...l.branches.flatMap((b) => b.steps)].forEach((s) => {
    if (s.kind === 'composition') s.composition.sample.forEach((p) => texts.push(p.greek));
    if (s.kind === 'story') [...(s.examples ?? []), ...(s.words ?? [])].forEach((p) => texts.push(p.greek));
  });
}
// Раздел «Тексты».
LIBRARY_TEXTS.forEach((t) => t.sentences.forEach((s) => texts.push(s.greek)));
LETTERS.forEach((l) => texts.push(l.example.greek));
COMBINATIONS.forEach((c) => c.examples.forEach((e) => texts.push(e.greek)));
Object.values(STRESS_EXAMPLES).forEach((e) => texts.push(e.greek));
// Урок 0: тексты, многословные слова лесенки (меню), примеры ответвлений.
// Одно слово целиком — сам себе словарная форма; разбиваются только фразы.
for (const s of [...READING_COURSE.steps, ...READING_COURSE.branches.flatMap((b) => b.steps)]) {
  const add = (greek: string) => analyzePhrase(greek).filter((t) => t.isWord).length > 1 && texts.push(greek);
  if (s.kind === 'text') s.sentences.forEach((p) => add(p.greek));
  if (s.kind === 'ladder' || s.kind === 'build') s.words.forEach((w) => add(w.plain ?? w.greek));
  if (s.kind === 'letters') s.letters.forEach((l) => add(l.example.greek));
  if (s.kind === 'story') [...(s.examples ?? []), ...(s.words ?? [])].forEach((p) => add(p.greek));
}

const missing = new Map<string, number>();
for (const t of texts) {
  for (const token of analyzePhrase(t)) {
    if (!token.isWord || lookupToken(token)) continue;
    const w = token.text.toLowerCase();
    missing.set(w, (missing.get(w) ?? 0) + 1);
  }
}
const list = [...missing].toSorted((a, b) => b[1] - a[1]);
console.log(`Фраз: ${texts.length}, слов без словарной формы: ${list.length}`);
console.log(list.map(([w, n]) => `${w} ×${n}`).join('\n'));
process.exitCode = list.length ? 1 : 0;
