import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { getLesson, type LessonStep } from '@/entities/lesson';
import { SentenceTrainer, type TrainerMode } from './SentenceTrainer';

const lesson = getLesson(1)!;
const items = (mode: TrainerMode) => {
  const s = [...lesson.steps, ...lesson.homework].find((x): x is Extract<LessonStep, { kind: TrainerMode }> => x.kind === mode);
  return s?.items ?? [];
};

/** Фразы: перевод, диктант, устно (данные — ДЗ урока 1). */
const meta = {
  title: 'Фичи/Тренажёр фраз',
  component: SentenceTrainer,
  args: { mode: 'translate', items: items('translate'), onComplete: fn() },
} satisfies Meta<typeof SentenceTrainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Перевод: Story = {};
export const Диктант: Story = { args: { mode: 'dictation', items: items('dictation') } };
export const Устно: Story = { args: { mode: 'oral', items: items('oral') } };
