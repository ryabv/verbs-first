import type { Meta, StoryObj } from '@storybook/react-vite';
import { getLesson, knownVerbIds } from '@/entities/lesson';
import { getVerbs } from '@/entities/verb';
import { ReadingView } from './ReadingView';

const lesson = getLesson(1)!;

/** Чтение текста: нажатие на слово — разбор формы глагола, вопросы к тексту. */
const meta = {
  title: 'Фичи/Чтение текста',
  component: ReadingView,
  args: { reading: lesson.readings[0]!, verbs: getVerbs(knownVerbIds(lesson)) },
} satisfies Meta<typeof ReadingView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Текст: Story = {};
export const НезнакомыеСлова: Story = { name: 'Подсветка незнакомых', args: { markUnknown: (t) => t.text.length > 6 } };
