/**
 * Реестр типов заданий закрепления главы: навык и что ученик делает на каждом уровне.
 * Карточки типов — docs/product/tasks.md; данные заданий — PracticeTask (types.ts).
 * Новый тип задания: карточка в tasks.md → тип в PracticeTask → запись здесь → компонент в pages/story → проверка в scripts/story-check.ts.
 */
import type { PracticeTask, StoryLevel } from './types';

export type TaskSkill = 'reading' | 'listening' | 'writing';

export const TASK_SKILL_LABELS: Record<TaskSkill, string> = {
  reading: 'Чтение',
  listening: 'Слушание',
  writing: 'Письмо',
};

export interface PracticeKind {
  /** Название типа — как в каталоге tasks.md. */
  title: string;
  skill: TaskSkill;
  /** Что ученик делает на каждом уровне (матрица «навык × уровень»). */
  levels: Record<StoryLevel, string>;
}

export const PRACTICE_KINDS = {
  gap: {
    title: 'Пропуск в тексте',
    skill: 'writing',
    levels: { light: 'выбрать форму из вариантов', medium: 'вписать; рядом начальная форма и лицо', hard: 'вписать; рядом только значение' },
  },
  tap: {
    title: 'Нажать слова в тексте',
    skill: 'reading',
    levels: { light: 'нажать; сказано, сколько слов', medium: 'нажать, без числа', hard: 'нажать, без числа' },
  },
  choose: {
    title: 'Выбрать вариант',
    skill: 'reading',
    levels: { light: 'выбрать', medium: 'выбрать', hard: 'выбрать' },
  },
  listen: {
    title: 'Услышать и выбрать',
    skill: 'listening',
    levels: { light: 'выбрать написанное', medium: 'выбрать смысл', hard: 'записать (диктант)' },
  },
  translate: {
    title: 'Перевести фразу',
    skill: 'writing',
    levels: { light: 'собрать из плиток (tiles)', medium: 'вписать с подсказкой', hard: 'вписать' },
  },
} as const satisfies Record<PracticeTask['kind'], PracticeKind>;
