import type { Direction } from '@/entities/card';

/** Что показываем. */
export type Prompt = 'ru' | 'gr' | 'audio';
/** Как отвечаем. */
export type AnswerMode = 'choose' | 'write' | 'self';

export interface TrainingSettings {
  prompt: Prompt;
  answer: AnswerMode;
}

export const PROMPT_LABELS: Record<Prompt, string> = {
  ru: 'Русское слово',
  gr: 'Греческое слово',
  audio: 'Греческое на слух',
};

export const ANSWER_LABELS: Record<AnswerMode, string> = {
  choose: 'Выбрать',
  write: 'Написать',
  self: 'Вспомнить',
};

/**
 * На каком языке отвечаем: на русский вопрос — по-гречески, на греческий — по-русски.
 * На слух: написать — по-гречески (диктант), выбрать/вспомнить — перевод.
 */
export function answerLanguage({ prompt, answer }: TrainingSettings): 'gr' | 'ru' {
  if (prompt === 'ru') return 'gr';
  if (prompt === 'audio' && answer === 'write') return 'gr';
  return 'ru';
}

/** Прогресс копится отдельно для «вспоминаю греческое» и «понимаю греческое». */
export const directionOf = (s: TrainingSettings): Direction => (answerLanguage(s) === 'gr' ? 'ru-gr' : 'gr-ru');

const STORAGE_KEY = 'verbs-first:cards:settings';

export function readSettings(): TrainingSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<TrainingSettings> | null;
    if (raw?.prompt && raw.answer && raw.prompt in PROMPT_LABELS && raw.answer in ANSWER_LABELS) {
      return { prompt: raw.prompt, answer: raw.answer };
    }
  } catch {
    /* по умолчанию */
  }
  return { prompt: 'ru', answer: 'choose' };
}

export function writeSettings(s: TrainingSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* не критично */
  }
}
