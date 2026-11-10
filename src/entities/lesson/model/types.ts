import type { QuizItem, ReadingExample } from '@/entities/alphabet/@x/lesson';
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
  /** Этап урока (1, 2, 3… → lesson.stages[n - 1]): точка на карте урока. У шагов ДЗ этап — их часть. */
  stage?: number;
}

/** Часть домашнего задания: идёт на карте сразу после своей темы. */
export interface HomeworkPart {
  title: string;
  /** После какого этапа урока (номер, как step.stage). */
  after: number;
}

/** Этап урока на карте: несколько коротких шагов, за прохождение — медальон. */
export interface StageInfo {
  title: string;
  /** Надпись медальона: «Настоящее освоено». */
  award: string;
}

/**
 * Ответвление от этапа: необязательные шаги — любопытное и дополнительная практика.
 * На карте — пунктирная тропинка от точки этапа; на прогресс урока и медальоны не влияет.
 */
export interface LessonBranch {
  id: string;
  /** К какому этапу урока относится (номер, как step.stage). */
  stage: number;
  title: string;
  steps: LessonStep[];
}

/** Какие клетки таблицы показывать в шаге «глаголы»: только уже пройденные. Пусто = все. */
export interface TableScope {
  tenses?: Tense[];
  forms?: SentenceForm[];
}

/** Буква или сочетание в курсе чтения: звук и как запомнить. */
export interface LetterIntro {
  /** Строчная буква или сочетание: 'α', 'ου'. Заглавная берётся из алфавита. */
  char: string;
  sound: string;
  /** Как запомнить: на что похожа, чем отличается от русской. */
  tip: string;
  /** Слово-пример — только из уже знакомых букв. */
  example: ReadingExample;
}

/** Вид текста курса чтения: записка, открытка, объявление, табличка. */
export type TextLook = 'note' | 'postcard' | 'announcement' | 'sign';

/** Слог: как пишется и как читается. */
export type Syllable = [greek: string, reading: string];

export type LessonStep =
  | (StepBase & { kind: 'theory'; sectionIds: string[] })
  /** Таблицы глаголов. verbIds не задан — глаголы урока (без опорных: είμαι идёт своим шагом). */
  | (StepBase & { kind: 'verbs'; verbIds?: string[]; scope?: TableScope })
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
  | (StepBase & { kind: 'exam' })
  /**
   * Любопытное: этимология, факт о языке. paragraphs — рассказ, examples — греческие примеры
   * с озвучкой, words — немного новых слов (их можно добавить в карточки).
   */
  | (StepBase & { kind: 'story'; paragraphs: string[]; examples?: Phrase[]; words?: Phrase[] })
  // ---- курс чтения (урок 0) ----
  /** Новые буквы: звук, как запомнить, слово-пример. */
  | (StepBase & { kind: 'letters'; letters: LetterIntro[] })
  /** Слоги: нажать — услышать и увидеть чтение. Ряды — по согласной. */
  | (StepBase & { kind: 'syllables'; rows: Syllable[][] })
  /** Лесенка слов: от коротких к длинным; прочитать самому, потом проверить. */
  | (StepBase & { kind: 'ladder'; words: ReadingExample[] })
  /** Выбор ответа. listen — вопрос звучит, ответ выбирается по написанию. */
  | (StepBase & { kind: 'choice'; question: string; items: QuizItem[]; listen?: boolean })
  /** Собрать слово из плиток-букв; extra — лишние буквы-ловушки. */
  | (StepBase & { kind: 'build'; words: ReadingExample[]; extra: string })
  /**
   * Короткий жизненный текст (записка, открытка, объявление): прочитать целиком,
   * нажать на строку — чтение, перевод, озвучка. look — как выглядит.
   */
  | (StepBase & { kind: 'text'; look: TextLook; sentences: ReadingExample[] })
  /** Алфавит по порядку. */
  | (StepBase & { kind: 'order' })
  /** Правила ударения и знаков. */
  | (StepBase & { kind: 'rules' });

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
  /** Путь ученика по уроку: теория и практика чередуются. У каждого шага — stage. */
  steps: LessonStep[];
  /** Этапы урока (до ДЗ): по одному времени или теме за раз. */
  stages: StageInfo[];
  /** Необязательные ответвления от этапов: любопытное и доп. практика. */
  branches: LessonBranch[];
  /** Домашнее задание: шаги, разбитые на части (поле part). Идёт в пути после урока, перед экзаменом. */
  homework: LessonStep[];
  /** Названия частей ДЗ: «Настоящее время»… */
  homeworkParts: HomeworkPart[];
}

/**
 * Курс из этапов без глаголов и ДЗ — курс чтения (урок 0). Путь, карта и медальоны — те же, что у урока.
 */
export interface Course {
  id: string;
  title: string;
  summary: string;
  steps: LessonStep[];
  stages: StageInfo[];
  branches: LessonBranch[];
  /** Надпись медальона за экзамен. */
  examAward: string;
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
