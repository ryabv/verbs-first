import { LETTERS, MARKS_QUIZ, SOUND_QUIZ, WORD_QUIZ, type QuizItem } from '@/entities/alphabet';
import { shuffle } from './random';
import type { ChoiceQuestion, ExamQuestion } from './types';

const OPTIONS = 4;

/** Вопрос тренажёра → вопрос экзамена (варианты: свои неверные или ответы других вопросов). */
function toChoice(
  item: QuizItem,
  pool: readonly QuizItem[],
  label: string,
  greekPrompt: boolean,
  id: string,
  /** Сочетания букв («ει, οι») озвучивать нечем. */
  speakable = greekPrompt,
): ChoiceQuestion {
  const wrongPool = item.distractors ?? shuffle(pool.map((i) => i.answer));
  const wrong = [...new Set(wrongPool)].filter((a) => a !== item.answer).slice(0, OPTIONS - 1);
  const options = shuffle([item.answer, ...wrong]);
  const speak = speakable ? (item.speak ?? item.prompt) : undefined;
  return { id, type: 'choice', label, prompt: item.prompt, greekPrompt, options, answer: options.indexOf(item.answer), speak };
}

/** Строчная буква для показа (у сигмы в данных «σ / ς»). */
const lower = (i: number) => LETTERS[i]!.lower.split(' / ')[0]!;

/** «Какая буква идёт после λ?» — порядок алфавита. */
function orderQuestion(at: number): ChoiceQuestion {
  const answer = lower(at + 1);
  const wrong = shuffle(LETTERS.map((_, i) => i).filter((i) => i !== at + 1 && i !== at))
    .slice(0, OPTIONS - 1)
    .map(lower);
  const options = shuffle([answer, ...wrong]);
  return {
    id: `order:${at}`,
    type: 'choice',
    label: 'Порядок букв',
    prompt: `Какая буква идёт после ${lower(at)}?`,
    greekPrompt: false,
    options,
    answer: options.indexOf(answer),
  };
}

/**
 * Экзамен по всему разделу «Алфавит»: буквы, сочетания, чтение слов, ударение и знаки, порядок.
 * 20 вопросов с вариантами; озвучка — только в разборе (иначе она подсказывает).
 */
export function buildAlphabetExam(): ExamQuestion[] {
  const letters = SOUND_QUIZ.slice(0, LETTERS.length);
  const combos = SOUND_QUIZ.slice(LETTERS.length);
  const questions: ExamQuestion[] = [
    ...shuffle(letters)
      .slice(0, 5)
      .map((q) => toChoice(q, letters, 'Буква → звук', true, `letter:${q.prompt}`)),
    ...shuffle(combos)
      .slice(0, 3)
      .map((q) => toChoice(q, combos, 'Сочетание → звук', true, `combo:${q.prompt}`, false)),
    ...shuffle(WORD_QUIZ)
      .slice(0, 6)
      .map((q) => toChoice(q, WORD_QUIZ, 'Как читается', true, `word:${q.prompt}`)),
    ...MARKS_QUIZ.map((q, i) => toChoice(q, MARKS_QUIZ, 'Ударение и знаки', false, `mark:${i}`)),
    ...shuffle(LETTERS.slice(0, -1).map((_, i) => i))
      .slice(0, 2)
      .map(orderQuestion),
  ];
  return shuffle(questions);
}
