/**
 * Какие слова на сайте нельзя добавить в карточки словарной формой.
 * Запуск: pnpm lexicon:check. Непокрытые слова — дописать в src/entities/dictionary/data/words.ts.
 */
import { COMBINATIONS, LETTERS, STRESS_EXAMPLES } from '@/entities/alphabet';
import { getLesson, getLessonCatalog, type Lesson } from '@/entities/lesson';
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
  [...l.steps, ...l.homework].forEach((s) => {
    if (s.kind === 'composition') s.composition.sample.forEach((p) => texts.push(p.greek));
  });
}
LETTERS.forEach((l) => texts.push(l.example.greek));
COMBINATIONS.forEach((c) => c.examples.forEach((e) => texts.push(e.greek)));
Object.values(STRESS_EXAMPLES).forEach((e) => texts.push(e.greek));

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
