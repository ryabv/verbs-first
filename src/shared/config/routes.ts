export const routes = {
  /** Главная — карта «Истории»: основной путь обучения. */
  home: () => '/',
  /** Список уроков: из шапки убран, страницы уроков — по прямым ссылкам. */
  lessons: () => '/lessons',
  lesson: (id: number | string) => `/lesson/${id}`,
  /** Урок 0 — курс чтения: карта, ?step=… — шаг. */
  alphabet: () => '/alphabet',
  /** Справочник алфавита: все буквы и сочетания, тренажёры. */
  alphabetReference: (section?: string) => `/alphabet?mode=reference${section ? `&section=${section}` : ''}`,
  /** Карточки; lesson — сразу выбрать наборы этого урока. */
  cards: (opts: { lesson?: number } = {}) => (opts.lesson ? `/cards?lesson=${opts.lesson}` : '/cards'),
  /** Тексты для чтения; id — один текст. */
  texts: () => '/texts',
  text: (id: string) => `/texts/${encodeURIComponent(id)}`,
  /** Справочник: тема и (по желанию) правило — #якорь. */
  grammar: (topic?: string, rule?: string) => (topic ? `/grammar/${topic}${rule ? `#${rule}` : ''}` : '/grammar'),
  /** История: главы; шаг — номер с 1 или end (вся глава и конспект). */
  story: () => '/',
  storyChapter: (id: number) => `/story/${id}`,
  storyStep: (id: number, step: number | 'end') => `/story/${id}/${step}`,
} as const;
