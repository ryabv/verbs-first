import { READING_COURSE } from '@/entities/alphabet';
import { getLesson, getLessonCatalog, knownVerbIds, type Lesson } from '@/entities/lesson';
import { LIBRARY_TEXTS, type LibraryText } from '@/entities/library';
import { getVerbs } from '@/entities/verb';

/** О чём короткие тексты курса чтения (урок 0). */
const COURSE_SUMMARIES: Record<string, string> = {
  'r4-text': 'Записка Элени Костасу: ушла на рынок, потом к Марии — приходи к семи.',
  'r7-text': 'Открытка с Крита: море каждый день, вечером — рыба в таверне.',
  'r8-text': 'Объявление на пароме до Санторини: когда прибываем и что открыто.',
  'r10-acropolis': 'Табличка у входа в Акрополь: часы работы и что нельзя делать.',
};

const lessons = (): Lesson[] =>
  getLessonCatalog()
    .map((c) => getLesson(c.id))
    .filter((l): l is Lesson => l !== undefined);

/**
 * Все тексты раздела: свои тексты библиотеки, тексты уроков и короткие тексты курса чтения.
 * Тексты уроков и алфавита не копируются — берутся из их данных.
 */
function build(): LibraryText[] {
  const course: LibraryText[] = READING_COURSE.steps.flatMap((s) =>
    s.kind === 'text'
      ? [
          {
            id: `alphabet-${s.id}`,
            level: 0,
            genre: 'Из урока 0',
            title: s.title,
            summary: COURSE_SUMMARIES[s.id] ?? 'Короткий текст курса чтения.',
            sentences: s.sentences.map((x) => ({ greek: x.plain ?? x.greek, russian: x.russian })),
            glossary: {},
            questions: [],
          },
        ]
      : [],
  );
  const fromLessons: LibraryText[] = lessons().flatMap((l) =>
    l.readings.map((r) => ({
      ...r,
      id: `lesson-${l.id}-${r.id}`,
      level: l.id,
      genre: `Из урока ${l.id}`,
      summary: r.sentences.slice(0, 2).map((x) => x.russian).join(' '),
      // В разделе — просто чтение: «найдите глаголы» остаётся в уроке.
      findTense: undefined,
    })),
  );
  return [...course, ...LIBRARY_TEXTS, ...fromLessons].toSorted((a, b) => a.level - b.level);
}

let cache: LibraryText[] | null = null;
export const allTexts = (): LibraryText[] => (cache ??= build());
export const findText = (id: string) => allTexts().find((t) => t.id === id);

/** Глаголы всех уроков: в текстах разбираются любые пройденные формы. */
export function allVerbs() {
  const last = lessons().at(-1);
  return getVerbs(last ? knownVerbIds(last) : []);
}

export const LEVEL_TITLES: Record<number, string> = { 0: 'Только читаю — после алфавита' };
export const levelTitle = (level: number) => LEVEL_TITLES[level] ?? `После урока ${level}`;
