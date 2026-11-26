export const routes = {
  /** Главная — прогресс по зонам учёбы (docs/product/home.md). */
  home: () => '/',
  /** Профиль: тема, уровень заданий. */
  profile: () => '/profile',
  /** Коллекция: сосуды, находки, медальоны (вкладка — `tab`, по умолчанию сосуды). */
  collection: (tab?: 'vessels' | 'finds' | 'medals') => (tab && tab !== 'vessels' ? `/profile/collection?tab=${tab}` : '/profile/collection'),
  /** Список уроков: из шапки убран, страницы уроков — по прямым ссылкам. */
  lessons: () => '/lessons',
  lesson: (id: number | string) => `/lesson/${id}`,
  /** Пролог «Греческий алфавит» (курс чтения): оглавление; шаг — номер с 1; заметка Анны — по id. */
  alphabet: () => '/alphabet',
  alphabetStep: (n: number) => `/alphabet/${n}`,
  alphabetNote: (id: string) => `/alphabet/note/${id}`,
  /** Справочник алфавита: все буквы и сочетания, тренажёры. */
  alphabetReference: (section?: string) => `/alphabet?mode=reference${section ? `&section=${section}` : ''}`,
  /** Карточки; lesson — сразу выбрать наборы этого урока. */
  cards: (opts: { lesson?: number } = {}) => (opts.lesson ? `/cards?lesson=${opts.lesson}` : '/cards'),
  /** Тексты для чтения; id — один текст. */
  texts: () => '/texts',
  text: (id: string) => `/texts/${encodeURIComponent(id)}`,
  /** Справочник: тема и (по желанию) правило — #якорь. */
  grammar: (topic?: string, rule?: string) => (topic ? `/grammar/${topic}${rule ? `#${rule}` : ''}` : '/grammar'),
  /** Ежедневные: календарь месяца (`month` — ГГГГ-ММ, по умолчанию текущий) и день (`date` — ГГГГ-ММ-ДД). */
  today: (month?: string) => (month ? `/today?month=${month}` : '/today'),
  day: (date: string) => `/today/${date}`,
  /** История: главы; шаг — номер с 1 или end (конец главы: конспект и «Закрепить»). */
  /** Карта «Истории» (не /story и не /map: там папки public/story и public/map — сервер отдал бы их). */
  story: () => '/island',
  storyChapter: (id: number) => `/story/${id}`,
  storyStep: (id: number, step: number | 'end') => `/story/${id}/${step}`,
  /** Закрепление главы: задания по уровням. */
  storyPractice: (id: number) => `/story/${id}/practice`,
  /** Рассказ кота Ερμής — ответвление главы. */
  storyBranch: (id: number, branch: string) => `/story/${id}/cat/${branch}`,
} as const;
