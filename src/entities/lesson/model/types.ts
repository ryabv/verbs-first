import type { SentenceForm, Tense } from '@/entities/verb/@x/lesson';

export interface Phrase {
  greek: string;
  russian: string;
}

export interface GrammarSection {
  id: string;
  title: string;
  paragraphs: string[];
  examples?: Phrase[];
}

/** Что должно быть в сочинении — проверяется автоматически по формам глаголов урока. */
export type CompositionCheck =
  | { kind: 'sentences'; min: number }
  | { kind: 'tense'; tense: Tense }
  | { kind: 'question' }
  | { kind: 'negative' };

export interface LessonTopic {
  title: string;
  phrases: Phrase[];
  /** Мини-презентация «о себе» — принцип 3 методики. */
  presentation: CompositionTask;
}

export interface ReadingQuestion {
  question: string;
  options: string[];
  /** Индекс правильного варианта. */
  answer: number;
}

/** Текст для чтения и разбора. */
export interface ReadingText {
  id: string;
  title: string;
  sentences: Phrase[];
  /** Слова, которые не глаголы урока: ключ — слово в нижнем регистре без ударений. */
  glossary: Record<string, string>;
  questions: ReadingQuestion[];
  /** Задание «найдите все глаголы в …». */
  findTense?: Tense;
}

/** Группа новых слов урока (для карточек). Глаголы и фразы темы добавляются автоматически. */
export interface VocabGroup {
  id: string;
  title: string;
  words: Phrase[];
}

/** Какие ячейки таблицы тренирует упражнение. Пусто = все. */
export interface DrillScope {
  verbIds?: string[];
  tenses?: Tense[];
  forms?: SentenceForm[];
}

/** Фраза для перевода, диктанта или проговаривания. greek[0] — эталон, остальные — тоже верные варианты. */
export interface SentenceItem {
  russian: string;
  greek: string[];
}

export interface CompositionTask {
  task: string;
  sample: Phrase[];
  checklist: CompositionCheck[];
}

interface StepBase {
  id: string;
  title: string;
  /** Что делаем и зачем — одна-две фразы от «преподавателя». */
  intro?: string;
  /** Часть домашнего задания (1, 2, 3…): шаги ДЗ группируются по частям. Без сроков — в своём темпе. */
  part?: number;
}

export type LessonStep =
  | (StepBase & { kind: 'theory'; sectionIds: string[] })
  | (StepBase & { kind: 'verbs'; verbIds?: string[] })
  | (StepBase & { kind: 'drill'; scope: DrillScope; goal: number })
  | (StepBase & { kind: 'reading'; readingId: string })
  | (StepBase & { kind: 'phrases' })
  | (StepBase & { kind: 'presentation' })
  /** Русская фраза → написать по-гречески. */
  | (StepBase & { kind: 'translate'; items: SentenceItem[] })
  /** Прослушать → записать по-гречески. */
  | (StepBase & { kind: 'dictation'; items: SentenceItem[] })
  /** Русская фраза → сказать вслух → сверить с образцом (самопроверка). */
  | (StepBase & { kind: 'oral'; items: SentenceItem[] })
  | (StepBase & { kind: 'composition'; composition: CompositionTask })
  /** Слова урока: добавить в карточки. */
  | (StepBase & { kind: 'words' })
  /** Экзамен по всему уроку (отдельный тип, строгие правила); задания собираются сами. */
  | (StepBase & { kind: 'exam' });

export type StepKind = LessonStep['kind'];

export interface Lesson {
  id: number;
  title: string;
  summary: string;
  grammar: GrammarSection[];
  topic: LessonTopic;
  /** Опорные глаголы урока (είμαι, έχω): в таблице, но не в тренажёре. */
  coreVerbIds: string[];
  /** 8 глаголов «Алгоритма глагола». */
  verbIds: string[];
  /** Тексты для чтения и разбора. */
  readings: ReadingText[];
  /** Новые слова урока по группам (кроме глаголов и фраз темы — они берутся сами). */
  vocabulary: VocabGroup[];
  /** Путь ученика по уроку: теория и практика чередуются. */
  steps: LessonStep[];
  /** Домашнее задание: шаги, разбитые на части (поле part). Идёт в пути после урока, перед экзаменом. */
  homework: LessonStep[];
  /** Названия частей ДЗ: «Настоящее время»… */
  homeworkParts: string[];
}

/** Строка оглавления: урок может быть ещё не наполнен. */
export interface LessonCatalogItem {
  id: number;
  title: string;
  topic: string;
  available: boolean;
  /** Шагов во всём пути: урок + домашнее задание + экзамен. */
  stepCount: number;
}
