/**
 * Схема учебных данных — единственный источник: таблицы, поля записей, версия, миграции.
 * Та же схема будет на сервере (фаза 3): таблицы и поля совпадают, сервер добавляет только `userId`.
 * Правила (docs/ARCHITECTURE.md, «Хранилище учебных данных»): у записи `id` (строка, составной ключ — явно: `1:ermis`),
 * `updatedAt`, удаление — надгробие `deletedAt`. Новая таблица или поле: DB_VERSION +1 и шаг в MIGRATIONS.
 */

/** Поля, общие для всех записей. */
export interface DbRecord {
  id: string;
  /** ISO-время последнего изменения: по нему сервер решает конфликты. */
  updatedAt: string;
  /** ISO-время удаления (надгробие). */
  deletedAt?: string;
}

/** Уровень 1…3: лёгкий, средний, сложный. */
export type Rank = 1 | 2 | 3;

/** Прогресс слова в одном направлении (коробка Лейтнера). */
export interface SrsFields {
  /** Коробка 0…5: верный ответ +1, ошибка — 0. */
  box: number;
  /** Сколько раз отвечали. 0 — новое слово. */
  seen: number;
  /** Когда повторить (начало дня, мс). Нет — пора. */
  due?: number;
}

/** Поля записей по таблицам (без `id`, `updatedAt`, `deletedAt`). */
export interface Schema {
  /** id — имя настройки: `story-level`, `cards-mode`. */
  settings: { value: string };
  /** id — `глава:ключ`: `1:anna` (шаг прочитан), `1:end`, `1:p:einai` (задание закрепления), `1:cat:name` (рассказ кота). */
  story_progress: {
    chapter: number;
    key: string;
    kind: 'step' | 'end' | 'practice' | 'branch';
    /** Лучший уровень; при слиянии — максимум. */
    rank: Rank;
  };
  /** id — `lesson:1`, `reading` (курс чтения). При слиянии `completed` объединяется. */
  lesson_progress: { completed: string[]; current?: string };
  /** id — номер урока или `alphabet`. При слиянии — лучший результат. */
  exam_results: { best: number; passed: boolean };
  /** id — `lesson:1`: этапы, чей медальон уже показан с анимацией. */
  awards: { seen: string[] };
  /** id — текст; запись есть — прочитан. */
  texts_read: Record<never, never>;
  /** id — набор: `my-words`, `lesson-1-verbs`, `story`, `deck-…`. */
  decks: {
    title: string;
    lessonId?: number;
    createdAt: number;
    /** Когда в набор последний раз добавляли слово. */
    usedAt?: number;
  };
  /** Одно слово — одна карточка, даже если оно в нескольких наборах. */
  cards: {
    deckIds: string[];
    greek: string;
    russian: string;
    createdAt: number;
    progress: Record<'ru-gr' | 'gr-ru', SrsFields>;
  };
  /** id — день занятий `2026-11-21` (серия дней подряд, календарь). */
  activity_days: Record<never, never>;
  /**
   * Ежедневные: id — дата дня `2026-11-22`. Набор заданий фиксируется при первом открытии дня.
   * При слиянии: `tasks` — первая запись, `solved` и `revealed` объединяются.
   */
  daily_days: {
    /** Ключи заданий дня по порядку (`p:3:eidan`, `w:3:s:4:listen`…) — см. features/daily. */
    tasks: string[];
    /** Решены сами. */
    solved: string[];
    /** Решены с «Показать ответ»: день закрыт, но не «чисто». */
    revealed: string[];
  };
  /** id — игра: `alphabet-order`. Личный рекорд; поля — свои у игры. */
  records: { mistakes?: number; ms?: number; points?: number };
  /** Журнал ответов, только дописывается. Без текста ответа — только итог. */
  attempts: {
    /** Когда, ISO. */
    at: string;
    /** Откуда: `story-practice`, `daily`, позже `event`. */
    source: string;
    /** Задание: `глава:id` для закрепления, ключ задания дня для ежедневных. */
    item: string;
    /** Тип задания (gap, listen…). */
    kind: string;
    level: string;
    result: 'right' | 'revealed' | 'skipped';
  };
}

export type TableName = keyof Schema;
/** Полная запись таблицы. */
export type RecordOf<N extends TableName> = Schema[N] & DbRecord;

/** Таблицы и зачем они — порядок и подписи для документации. */
export const TABLE_INFO = {
  settings: 'настройки ученика, которые идут за ним на любое устройство',
  story_progress: 'История: прочитанные шаги, конец главы, задания закрепления, рассказы кота',
  lesson_progress: 'уроки и курс чтения: пройденные шаги',
  exam_results: 'экзамены: лучший результат',
  awards: 'медальоны этапов, уже показанные',
  texts_read: 'прочитанные тексты',
  decks: 'наборы карточек',
  cards: 'карточки слов с прогрессом повторения',
  activity_days: 'дни занятий',
  daily_days: 'ежедневные: задания дня и что решено',
  records: 'личные рекорды мини-игр',
  attempts: 'журнал ответов — источник ежедневных «сначала ошибки» и метрик',
} as const satisfies Record<TableName, string>;

export const TABLES = Object.keys(TABLE_INFO) as TableName[];

/** Версия схемы = версия базы IndexedDB. */
export const DB_VERSION = 2;

/**
 * Миграции: шаг N переводит базу из версии N−1 в N. Сервер повторяет те же шаги.
 * Версия 1 — все таблицы с ключом `id`. Версия 2 — `daily_days` (ежедневные).
 */
export const MIGRATIONS: Record<number, (db: IDBDatabase) => void> = {
  1: (db) => {
    for (const name of TABLES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
  },
  2: (db) => {
    if (!db.objectStoreNames.contains('daily_days')) db.createObjectStore('daily_days', { keyPath: 'id' });
  },
};
