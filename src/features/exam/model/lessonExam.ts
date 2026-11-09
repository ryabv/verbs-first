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
import { pick, shuffle } from './random';
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
 * Экзамен урока: ~20 заданий вперемешку по всему уроку.
 * Собирается из данных урока, поэтому для новых уроков ничего писать не нужно.
 */
export function buildLessonExam(lesson: Lesson): ExamQuestion[] {
  const verbs = getVerbs(lesson.verbIds);
  const questions: ExamQuestion[] = [];

  // 1. Формы глаголов: разные глаголы и разные ячейки таблицы.
  const usedCells = new Set<string>();
  for (const verb of shuffle(verbs).slice(0, PLAN.form)) {
    let cell = { tense: pick(TENSES), form: pick(SENTENCE_FORMS), person: pick(PERSONS) };
    for (let i = 0; i < 10 && usedCells.has(`${cell.tense}:${cell.form}`); i++) {
      cell = { tense: pick(TENSES), form: pick(SENTENCE_FORMS), person: pick(PERSONS) };
    }
    usedCells.add(`${cell.tense}:${cell.form}`);
    questions.push({
      id: `form:${verb.id}`,
      type: 'write',
      label: `Таблица · ${TENSE_LABELS[cell.tense].toLowerCase()} · ${FORM_LABELS[cell.form].toLowerCase()}`,
      prompt: buildRussian(verb, cell),
      accepted: buildGreek(verb, cell),
      word: { greek: verb.lemma, russian: verb.translation, kind: 'verb' },
    });
  }

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

  // 6. Понимание текста.
  const readingQs = shuffle(lesson.readings.flatMap((r) => r.questions.map((q) => ({ r, q }))));
  readingQs.slice(0, PLAN.reading).forEach(({ r, q }, i) =>
    questions.push({
      id: `rd:${i}`,
      type: 'choice',
      label: 'Текст',
      context: r.title,
      prompt: q.question,
      greekPrompt: false,
      options: q.options,
      answer: q.answer,
    }),
  );

  return shuffle(questions);
}
