import type { Meta, StoryObj } from '@storybook/react-vite';
import { getLesson } from '@/entities/lesson';
import { buildAlphabetExam } from '../model/alphabetExam';
import { buildLessonExam } from '../model/lessonExam';
import { Exam } from './Exam';

const lesson = getLesson(1)!;

/** Экзамен: правила → задания без подсказок → итог и разбор. */
const meta = {
  title: 'Фичи/Экзамен',
  component: Exam,
  args: {
    id: 1,
    title: 'Экзамен по уроку 1',
    build: () => buildLessonExam(lesson),
    rules: ['Задания по всему уроку вперемешку.', 'Ударение обязательно.'],
  },
} satisfies Meta<typeof Exam>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Урок: Story = { name: 'По уроку: начало' };
export const УрокСдан: Story = { name: 'По уроку: уже сдан', parameters: { db: { exam_results: [{ id: '1', best: 92, passed: true }] } } };
export const Алфавит: Story = {
  name: 'По алфавиту',
  args: { id: 'alphabet', title: 'Экзамен по алфавиту', build: buildAlphabetExam, rules: ['20 вопросов по всему курсу.'] },
};
