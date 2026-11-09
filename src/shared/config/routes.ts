export const routes = {
  home: () => '/',
  lesson: (id: number | string) => `/lesson/${id}`,
  alphabet: (section?: string) => (section ? `/alphabet?section=${section}` : '/alphabet'),
  /** Карточки; lesson — сразу выбрать наборы этого урока. */
  cards: (opts: { lesson?: number } = {}) => (opts.lesson ? `/cards?lesson=${opts.lesson}` : '/cards'),
} as const;
