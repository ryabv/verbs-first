/** Слово, которое можно отправить в карточки после экзамена. */
export interface ExamWord {
  greek: string;
  russian: string;
  kind: 'verb' | 'word';
}

interface Base {
  id: string;
  /** Что повторить, если ошиблись. */
  word?: ExamWord;
}

/** Написать по-гречески: форма глагола, перевод фразы, слово, диктант. */
export interface WriteQuestion extends Base {
  type: 'write';
  label: string;
  /** Русская фраза; у диктанта нет — только звук. */
  prompt?: string;
  /** Что проиграть (диктант). */
  audio?: string;
  accepted: string[];
  /** Перевод — показать после ответа в диктанте. */
  russian?: string;
}

/** Выбрать вариант: значение слова, вопрос к тексту. */
export interface ChoiceQuestion extends Base {
  type: 'choice';
  label: string;
  prompt: string;
  /** Подпись над вопросом (название текста). */
  context?: string;
  /** Греческий текст, по которому вопрос: проверяем понимание, а не память. */
  passage?: string[];
  greekPrompt: boolean;
  options: string[];
  answer: number;
  /** Что озвучить в разборе (по ходу экзамена озвучка подсказывала бы). */
  speak?: string;
}

export type ExamQuestion = WriteQuestion | ChoiceQuestion;
