/**
 * История — сериал по главам: глава закрепляет урок. Шаг ведёт по куску текста:
 * объяснение одной темы + задача прямо в тексте. Сюжет и формат — docs/story/README.md.
 */

export interface StorySentence {
  greek: string;
  russian: string;
}

/**
 * Уровни главы: текст один, задания разные (матрица «глава × уровень»).
 * - light — узнавание: пропуск выбирают из вариантов (`options` у пропуска);
 * - medium — с опорой: форму вписывают, рядом подсказка (начальная форма, лицо);
 * - hard — без опоры: вписывают без подсказки, реплику на слух — записывают (диктант).
 * Задания главы N на уровне L опираются только на объяснённое в главах 1…N на уровнях не выше L.
 */
export const STORY_LEVELS = ['light', 'medium', 'hard'] as const;
export type StoryLevel = (typeof STORY_LEVELS)[number];
export const STORY_LEVEL_LABELS: Record<StoryLevel, string> = { light: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };

/** Пропуск в тексте: слово `word` в предложении `sentence` (номер с 1) скрыто, пока ученик его не впишет. */
export interface StoryGap {
  sentence: number;
  word: string;
  /** Подсказка у поля (средний уровень): «αγοράζω, она, прошедшее». */
  hint: string;
  /** Варианты для лёгкого уровня, среди них — word. Формы пишутся явно. */
  options: string[];
}

export type StoryTask =
  /** Вписать форму в пропуск(и); на лёгком — выбрать из вариантов. */
  | { kind: 'gap'; gaps: StoryGap[] }
  /** Нажать в текущем куске все слова по условию. */
  | { kind: 'tap'; prompt: string; answer: string[] }
  /** Выбрать вариант; audio — сначала прослушать (вопрос «что сказали»). */
  | { kind: 'choose'; prompt: string; options: string[]; answer: number; audio?: string };

export interface StoryStep {
  id: string;
  title: string;
  /** Кусок текста: первое и последнее предложение, номера с 1. */
  sentences: [number, number];
  /**
   * Абзацы объяснения. Разметка: **жирный**, `фрагмент` — не слово (окончание, основа),
   * остальной греческий сам становится словами с переводом.
   */
  body: string[];
  task?: StoryTask;
}

export interface StoryChapter {
  id: number;
  /** После какого урока глава по силам. */
  lesson: number;
  /** Название по-гречески и перевод. */
  title: string;
  titleRu: string;
  /** Вступление на странице главы. */
  intro: string;
  sentences: StorySentence[];
  steps: StoryStep[];
  /** Конспект: строки с той же разметкой, что body. */
  summary: string[];
  /** Крючок к следующей главе. */
  teaser: string;
  /** Находка главы — в «рюкзак» на карте, когда глава дочитана. */
  find?: StoryFind;
  /** Иллюстрация места главы — в карточке на карте. Файл в public/story/, промпты — docs/story/illustrations.md. */
  image?: StoryImage;
}

export interface StoryImage {
  /** Имя файла в public/story/ (webp, 16:9). */
  file: string;
  /** Что на картинке — для экранного диктора. */
  alt: string;
}

export interface StoryFind {
  title: string;
  /** Что это и почему важно — одна-две фразы. */
  text: string;
  icon: 'letter' | 'photo' | 'map' | 'tape' | 'key';
}

/** «Глава» 0 на карте — пролог: курс чтения (алфавит), не глава истории. */
export const PROLOGUE = 0;

/** Место на карте острова: глава происходит здесь. Координаты — в системе 1000×640. */
export interface StoryPlace {
  chapter: number;
  /** Подпись на карте (по-русски), видна, когда место открыто. */
  name: string;
  x: number;
  y: number;
  /** За краем карты (паром в Пирей): рисуется у края с линией парома. */
  offMap?: boolean;
}
