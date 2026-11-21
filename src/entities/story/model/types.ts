/**
 * История — сериал по главам (Кипр, эпохи по 4 главы; глава — половина урока). Главу читают без замков:
 * шаг — кусок текста + объяснение одной темы + иногда вопрос на понимание. После главы — закрепление
 * (задания по уровням), между эпохами — порог. Сюжет и формат — docs/story/README.md, типы заданий — docs/product/tasks.md.
 */

export interface StorySentence {
  greek: string;
  russian: string;
}

/**
 * Уровни закрепления: текст один, задания разные (матрица «глава × уровень»).
 * - light — узнать: выбрать из вариантов, собрать из плиток;
 * - medium — с опорой: вписать, рядом подсказка (начальная форма, лицо);
 * - hard — без опоры: вписать, видя только значение по-русски; на слух — записать (диктант).
 * Задания главы N на уровне L опираются только на объяснённое в главах 1…N на уровнях не выше L.
 */
export const STORY_LEVELS = ['light', 'medium', 'hard'] as const;
export type StoryLevel = (typeof STORY_LEVELS)[number];
export const STORY_LEVEL_LABELS: Record<StoryLevel, string> = { light: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };

/** Вопрос на понимание — внутри чтения: одно нажатие, всегда лёгкий, провалить нельзя (ошибка — подсказка и ответ). */
export interface StoryCheck {
  prompt: string;
  options: string[];
  answer: number;
  /** Сначала прослушать: вопрос «что сказали». Текст — как в главе, для озвучки. */
  audio?: string;
}

/** Задание закрепления главы. id — постоянный: по нему хранится прогресс. */
export type PracticeTask =
  /**
   * Пропуск в предложении главы (копия предложения, текст главы не меняется).
   * Лёгкий — выбрать из `options`; средний — вписать, рядом `hint`; сложный — вписать, рядом `meaning`.
   */
  | { id: string; kind: 'gap'; sentence: number; word: string; hint: string; options: string[]; meaning: string }
  /** Нажать в куске главы все слова по условию. Лёгкий — с числом нужных слов. */
  | { id: string; kind: 'tap'; sentences: [number, number]; prompt: string; answer: string[] }
  /** Выбрать вариант; sentences — кусок главы перед глазами, без перевода на любом уровне. */
  | { id: string; kind: 'choose'; prompt: string; options: string[]; answer: number; sentences?: [number, number] }
  /**
   * На слух. Лёгкий — выбрать написанное (`options`, греческий); средний — выбрать смысл (`meanings`);
   * сложный — записать (диктант). answer — номер верного в обоих списках; audio — то, что звучит (= options[answer]).
   */
  | { id: string; kind: 'listen'; audio: string; options: string[]; meanings: string[]; answer: number }
  /**
   * Перевести фразу. Лёгкий — собрать из плиток (слова `greek[0]` + `decoys`); средний — вписать, рядом `hint`;
   * сложный — вписать. greek — все верные варианты, первый — эталон.
   */
  | { id: string; kind: 'translate'; russian: string; greek: string[]; decoys: string[]; hint: string };

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
  /** Вопрос на понимание — в 1–2 шагах из трёх. Ответ не должен быть просто написан в объяснении. */
  check?: StoryCheck;
}

export interface StoryChapter {
  id: number;
  /** Эпоха (по 4 главы): новая эпоха открывается, когда все главы прошлой закреплены хотя бы на лёгком. */
  epoch: number;
  /** Урок, половину которого закрепляет глава (главы 2k−1 и 2k — урок k). */
  lesson: number;
  /** Название по-гречески и перевод. */
  title: string;
  titleRu: string;
  /** Вступление на странице главы. */
  intro: string;
  sentences: StorySentence[];
  steps: StoryStep[];
  /** Закрепление главы: 8–12 заданий по трём навыкам (чтение, слушание, письмо). */
  practice: PracticeTask[];
  /** Конспект: строки с той же разметкой, что body. */
  summary: string[];
  /** Крючок к следующей главе. */
  teaser: string;
  /** Находка главы — в «рюкзак» на карте, когда глава дочитана. */
  find?: StoryFind;
  /** Иллюстрация места главы — в карточке на карте. Файл в public/story/, промпты — docs/story/illustrations.md. */
  image?: StoryImage;
  /** Рассказы кота Ερμής — необязательные ответвления: факты, мифы, откуда слова. */
  branches?: StoryBranch[];
}

/**
 * Ответвление главы — рассказ кота Ερμής (второй герой). Необязательно: на уровень и открытие глав не влияет.
 * На карте — метка-кот рядом с местом главы; доступен сразу, как только открыта глава.
 * Факты — только проверенные, слова — пройденные к главе (+1–2 новых в словарь).
 */
export interface StoryBranch {
  id: string;
  /** К какому шагу относится: в шаге — плашка «Ερμής хочет кое-что рассказать» под заданием (не в тексте главы). */
  after: string;
  title: string;
  /** Одна фраза для карточки на карте. */
  teaser: string;
  /** Метка на карте — рядом с местом главы, в системе 1000×640. */
  x: number;
  y: number;
  /** Рассказ от лица кота; разметка — как у body шага. */
  body: string[];
  /** Греческие примеры с переводом: слова открываются, фразы озвучены. */
  examples?: StorySentence[];
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
  icon: 'letter' | 'photo' | 'map' | 'tape' | 'key' | 'figurine';
}

/** «Глава» 0 на карте — пролог: курс чтения (алфавит), не глава истории. */
export const PROLOGUE = 0;

/** Похвала на салюте закрепления: звучит греческим голосом, перевод — рядом. */
export const STORY_PRAISE = { greek: 'Μπράβο!', russian: 'Молодец!' } as const;

/** Место на карте острова: глава происходит здесь. Координаты — в системе 1000×640. */
export interface StoryPlace {
  chapter: number;
  /** Подпись на карте (по-русски), видна, когда место открыто. */
  name: string;
  x: number;
  y: number;
  /** За краем карты (место вне острова): метка у края, без тропы. */
  offMap?: boolean;
  /** В воздухе (самолёт пролога): высота над землёй/морем в единицах карты; к аэропорту ведёт дуга полёта, а не тропа. */
  altitude?: number;
}
