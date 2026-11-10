export const routes = {
  home: () => '/',
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
} as const;
