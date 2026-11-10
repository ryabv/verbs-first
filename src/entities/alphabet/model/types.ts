/** Пример слова: греческий, перевод и чтение русскими буквами (ударение — знаком ́). */
export interface ReadingExample {
  greek: string;
  russian: string;
  reading: string;
  /**
   * Обычное написание, если слово показано иначе (вывеска ЗАГЛАВНЫМИ без ударений):
   * по нему озвучиваем — иначе синтезатор не знает, где ударение, — и добавляем в карточки.
   */
  plain?: string;
}

export interface Letter {
  upper: string;
  lower: string;
  /** Название буквы по-гречески (для озвучки). */
  name: string;
  /** Название по-русски. */
  nameRu: string;
  /**
   * Что отдать синтезатору вместо name. Короткие названия (μι, νι, ξι, φι, ψι)
   * он читает по буквам — «ми-йота», а одиночную букву произносит как её название.
   */
  speakAs?: string;
  /** Звук — коротко, для таблиц и тренажёра. */
  sound: string;
  /** Пояснение, если звука нет в русском или есть правило. */
  note?: string;
  example: ReadingExample;
}

/** Сочетание букв, которое читается не по буквам. */
export interface Combination {
  letters: string;
  sound: string;
  rule: string;
  examples: ReadingExample[];
}

/** Вопрос тренажёра с вариантами ответа. */
export interface QuizItem {
  /** Что показываем (буква, сочетание или слово). */
  prompt: string;
  /** Что озвучить (если отличается от prompt; пусто — не озвучиваем). */
  speak?: string;
  answer: string;
  /** Неверные варианты; если нет — берутся ответы других вопросов. */
  distractors?: string[];
  /** Пояснение после ответа. */
  note?: string;
}
