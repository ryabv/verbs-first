import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { READING_COURSE, SOUND_QUIZ, WORD_QUIZ } from '@/entities/alphabet';
import type { LessonStep } from '@/entities/lesson';
import { AlphabetOrder } from './AlphabetOrder';
import { BuildWord } from './BuildWord';
import { ChoiceQuiz } from './ChoiceQuiz';
import { SyllableGrid } from './SyllableGrid';
import { TextReader } from './TextReader';
import { WordLadder } from './WordLadder';

/** Курс чтения (урок 0): упражнения этапов (данные — entities/alphabet/data/course.ts). */
const meta = { title: 'Фичи/Курс чтения' } satisfies Meta;
export default meta;
type Story = StoryObj;

function step<K extends LessonStep['kind']>(kind: K, nth = 0) {
  return READING_COURSE.steps.filter((s): s is Extract<LessonStep, { kind: K }> => s.kind === kind)[nth];
}
const asText = (greek: string, russian: string) => (
  <span>
    {greek} — {russian}
  </span>
);

export const Слоги: Story = { render: () => <SyllableGrid rows={step('syllables')!.rows} /> };
export const Лесенка: Story = { name: 'Лесенка слов', render: () => <WordLadder words={step('ladder')!.words} renderWord={asText} /> };
export const СобериСлово: Story = {
  name: 'Собери слово',
  render: () => {
    const s = step('build')!;
    return <BuildWord words={s.words} extra={s.extra} onComplete={fn()} />;
  },
};
export const КакойЗвук: Story = { name: 'Выбор: какой звук', render: () => <ChoiceQuiz items={SOUND_QUIZ} question="Какой звук?" /> };
export const КакЧитается: Story = { name: 'Выбор: как читается', render: () => <ChoiceQuiz items={WORD_QUIZ} question="Как читается?" /> };
export const УслышьИВыбери: Story = {
  name: 'Услышь и выбери',
  render: () => {
    const s = READING_COURSE.steps.find((x) => x.kind === 'choice' && x.listen);
    return s?.kind === 'choice' ? <ChoiceQuiz items={s.items} question={s.question} listen /> : <p>нет шага</p>;
  },
};
export const Текст: Story = {
  render: () => {
    const s = step('text')!;
    return <TextReader sentences={s.sentences} look={s.look} renderWord={asText} />;
  },
};
export const ПорядокБукв: Story = { name: 'Порядок букв (игра)', render: () => <AlphabetOrder onComplete={fn()} /> };
