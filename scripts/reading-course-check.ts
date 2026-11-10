/**
 * Проверка курса чтения (урок 0): в словах этапа — только буквы и сочетания,
 * пройденные к этому этапу (шаги letters). Иначе ученик споткнётся о незнакомую букву.
 *
 *   pnpm reading:check
 */
import { READING_COURSE } from '@/entities/alphabet/data/course';
import type { LessonStep } from '@/entities/lesson/model/types';

/** Сочетания, которые читаются как один звук. γγ вводится вместе с γκ. */
const PAIRS = new Set(['ου', 'αι', 'ει', 'οι', 'μπ', 'ντ', 'γκ', 'γγ', 'τσ', 'τζ', 'αυ', 'ευ']);
const ALIAS: Record<string, string> = { γγ: 'γκ', ς: 'σ' };

interface Glyph {
  base: string;
  accent: boolean;
  diaeresis: boolean;
}

function glyphs(word: string): Glyph[] {
  return [...word.toLowerCase().normalize('NFC')].flatMap((ch) => {
    const parts = ch.normalize('NFD');
    const base = parts[0]!;
    if (!/\p{Script=Greek}/u.test(base)) return [];
    return [{ base: ALIAS[base] ?? base, accent: /́/.test(parts), diaeresis: /̈/.test(parts) }];
  });
}

/** Звуковые единицы слова: сочетание (если гласные не разделены ударением или точками) или буква. */
function units(word: string): string[] {
  const g = glyphs(word);
  const out: string[] = [];
  for (let i = 0; i < g.length; i++) {
    const a = g[i]!;
    const b = g[i + 1];
    const pair = b && a.base + b.base;
    // Ударение на первой гласной или точки на второй — гласные читаются раздельно.
    if (pair && PAIRS.has(pair) && !a.accent && !b.diaeresis) {
      out.push(ALIAS[pair] ?? pair);
      i++;
    } else out.push(a.base);
  }
  return out;
}

/** Греческие тексты шага, которые ученик должен прочитать. */
function textsOf(step: LessonStep): string[] {
  switch (step.kind) {
    case 'letters':
      return step.letters.map((l) => l.example.greek);
    case 'syllables':
      return step.rows.flat().map(([g]) => g);
    case 'ladder':
    case 'build':
      return step.words.map((w) => w.greek);
    case 'text':
      return step.sentences.map((s) => s.greek);
    case 'choice':
      // Вопросы с русским текстом (знаки, звуки букв) — не слова для чтения.
      return step.items.flatMap((i) => [i.prompt, ...(step.listen ? (i.distractors ?? []) : [])]).filter((t) => !/[а-яё]/i.test(t));
    default:
      return [];
  }
}

const known = new Set<string>();
const problems: string[] = [];
const stages = [...new Set(READING_COURSE.steps.map((s) => s.stage).filter((s) => s !== undefined))].toSorted((a, b) => a - b);

for (const stage of stages) {
  const steps = READING_COURSE.steps.filter((s) => s.stage === stage);
  for (const s of steps) if (s.kind === 'letters') s.letters.forEach((l) => known.add(ALIAS[l.char] ?? l.char));
  for (const s of steps)
    for (const text of textsOf(s)) {
      const unknown = [...new Set(units(text).filter((u) => !known.has(u)))];
      if (unknown.length) problems.push(`этап ${stage}, ${s.id}: «${text}» — ещё не пройдено: ${unknown.join(' ')}`);
    }
}

const all = [...known].filter((u) => u.length === 1);
if (all.length < 24) problems.push(`к концу курса пройдено букв: ${all.length} из 24`);

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\nПроблем: ${problems.length}`);
  process.exit(1);
}
console.log(`Курс чтения в порядке: ${stages.length} этапов, все слова — из пройденных букв.`);
