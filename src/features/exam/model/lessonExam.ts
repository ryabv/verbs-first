import { greekVariants } from '@/entities/card';
import type { Lesson, SentenceItem } from '@/entities/lesson';
import {
  buildGreek,
  buildRussian,
  FORM_LABELS,
  getVerbs,
  PERSONS,
  SENTENCE_FORMS,
  TENSE_LABELS,
  TENSES,
} from '@/entities/verb';
import { stripAccents } from '@/shared/lib/greek';
import { shuffle } from './random';
import type { ExamQuestion } from './types';

/** Сколько заданий каждого типа (если в уроке хватает материала). */
const PLAN = { form: 6, translate: 4, dictation: 3, wordWrite: 3, wordChoice: 2, reading: 2 } as const;

/** Фразы урока из перевода, диктанта и «вслух» — без повторов. */
function sentences(lesson: Lesson): SentenceItem[] {
  const seen = new Set<string>();
  const out: SentenceItem[] = [];
  for (const step of [...lesson.steps, ...lesson.homework]) {
    if (step.kind !== 'translate' && step.kind !== 'dictation' && step.kind !== 'oral') continue;
    for (const item of step.items) {
      const key = item.greek[0] ?? '';
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
  }
  return out;
}

/**
 * Ячейки таблицы для n заданий: время и форма идут «по диагоналям» перемешанных списков —
 * каждое время и каждая форма встречаются (при n ≥ 3) и пара «время + форма» не повторяется (до 9 заданий).
 * Лица — тоже по кругу, без повторов, пока хватает.
 */
function tableCells(n: number) {
  const tenses = shuffle(TENSES);
  const forms = shuffle(SENTENCE_FORMS);
  const persons = shuffle(PERSONS);
  return Array.from({ length: n }, (_, k) => ({
    tense: tenses[k % tenses.length]!,
    form: forms[(k + Math.floor(k / tenses.length)) % forms.length]!,
    person: persons[k % persons.length]!,
  }));
}

/** Берём по одному из каждой группы по кругу: [[a1,a2],[b1]] → a1, b1, a2. */
function roundRobin<T>(groups: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; groups.some((g) => i < g.length); i++) for (const g of groups) if (i < g.length) out.push(g[i]!);
  return out;
}

/**
 * Экзамен урока: ~20 заданий вперемешку по всему уроку.
 * Собирается из данных урока, поэтому для новых уроков ничего писать не нужно.
 */
export function buildLessonExam(lesson: Lesson): ExamQuestion[] {
  const verbs = getVerbs(lesson.verbIds);
  const questions: ExamQuestion[] = [];

  // 1. Формы глаголов: разные глаголы; каждое время и каждая форма — поровну, сочетания не повторяются.
  const cells = tableCells(PLAN.form);
  shuffle(verbs)
    .slice(0, PLAN.form)
    .forEach((verb, i) => {
      const cell = cells[i]!;
      questions.push({
        id: `form:${verb.id}`,
        type: 'write',
        label: `Таблица · ${TENSE_LABELS[cell.tense].toLowerCase()} · ${FORM_LABELS[cell.form].toLowerCase()}`,
        prompt: buildRussian(verb, cell),
        accepted: buildGreek(verb, cell),
        word: { greek: verb.lemma, russian: verb.translation, kind: 'verb' },
      });
    });

  // 2–3. Перевод и диктант — разные фразы, не повторяющие задания по таблице.
  const taken = new Set(questions.flatMap((q) => (q.type === 'write' ? q.accepted.map((g) => stripAccents(g)) : [])));
  const phrases = shuffle(sentences(lesson)).filter((p) => !p.greek.some((g) => taken.has(stripAccents(g))));
  phrases.slice(0, PLAN.translate).forEach((item, i) =>
    questions.push({ id: `tr:${i}`, type: 'write', label: 'Перевод', prompt: item.russian, accepted: item.greek }),
  );
  phrases.slice(PLAN.translate, PLAN.translate + PLAN.dictation).forEach((item, i) =>
    questions.push({
      id: `dict:${i}`,
      type: 'write',
      label: 'Диктант',
      audio: item.greek[0],
      accepted: item.greek,
      russian: item.russian,
    }),
  );

  // 4–5. Слова урока: написать по-гречески и выбрать значение.
  const words = shuffle(lesson.vocabulary.flatMap((g) => g.words));
  words.slice(0, PLAN.wordWrite).forEach((w) =>
    questions.push({
      id: `ww:${w.greek}`,
      type: 'write',
      label: 'Слово',
      prompt: w.russian,
      accepted: greekVariants(w.greek),
      word: { ...w, kind: 'word' },
    }),
  );
  words.slice(PLAN.wordWrite, PLAN.wordWrite + PLAN.wordChoice).forEach((w) => {
    const wrong = shuffle(words.filter((x) => x.russian !== w.russian).map((x) => x.russian)).slice(0, 3);
    const options = shuffle([w.russian, ...wrong]);
    questions.push({
      id: `wc:${w.greek}`,
      type: 'choice',
      label: 'Что значит',
      prompt: w.greek,
      greekPrompt: true,
      options,
      answer: options.indexOf(w.russian),
      word: { ...w, kind: 'word' },
    });
  });

  // 6. Понимание текста: текст перед глазами (без перевода) — проверяем чтение, а не то, что запомнилось с урока.
  // По очереди из разных текстов: два вопроса — к двум разным текстам, если их хватает.
  const byText = shuffle(lesson.readings).map((r) => shuffle(r.questions).map((q) => ({ r, q })));
  const readingQs = roundRobin(byText);
  readingQs.slice(0, PLAN.reading).forEach(({ r, q }, i) =>
    questions.push({
      id: `rd:${i}`,
      type: 'choice',
      label: 'Прочитайте и ответьте',
      context: r.title,
      passage: r.sentences.map((x) => x.greek),
      prompt: q.question,
      greekPrompt: false,
      options: q.options,
      answer: q.answer,
    }),
  );

  return shuffle(questions);
}
