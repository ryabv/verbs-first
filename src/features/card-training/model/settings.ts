import type { Direction } from '@/entities/card';

/** Что показываем. */
export type Prompt = 'ru' | 'gr' | 'audio';
/** Как отвечаем. */
export type AnswerMode = 'choose' | 'write' | 'self';

export interface TrainingSettings {
  prompt: Prompt;
  answer: AnswerMode;
}

/** Режим тренировки — понятным словом вместо пары «показываем / отвечаем». */
export type Mode = 'flip' | 'recall' | 'recognize' | 'listen' | 'write';

export const MODES: Record<Mode, { title: string; text: string; settings: TrainingSettings }> = {
  flip: { title: 'Карточки', text: 'Видите русское — вспоминаете греческое, переворачиваете и честно отвечаете себе', settings: { prompt: 'ru', answer: 'self' } },
  recall: { title: 'Вспоминаю', text: 'Русское слово — выбрать греческое из четырёх', settings: { prompt: 'ru', answer: 'choose' } },
  recognize: { title: 'Узнаю', text: 'Греческое слово — выбрать перевод', settings: { prompt: 'gr', answer: 'choose' } },
  listen: { title: 'На слух', text: 'Слово звучит — выбрать перевод', settings: { prompt: 'audio', answer: 'choose' } },
  write: { title: 'Пишу', text: 'Русское слово — написать по-гречески', settings: { prompt: 'ru', answer: 'write' } },
};
export const MODE_IDS = Object.keys(MODES) as Mode[];

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

const MODE_KEY = 'verbs-first:cards:mode';
/** Прежние настройки (показываем + отвечаем) — переводим в ближайший режим. */
const OLD_KEY = 'verbs-first:cards:settings';

export function readMode(): Mode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw && raw in MODES) return raw as Mode;
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? 'null') as Partial<TrainingSettings> | null;
    if (old?.prompt === 'audio') return 'listen';
    if (old?.answer === 'write') return 'write';
    if (old?.answer === 'self') return 'flip';
    if (old?.prompt === 'gr') return 'recognize';
  } catch {
    /* по умолчанию */
  }
  return 'recall';
}

export function writeMode(mode: Mode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* не критично */
  }
}
