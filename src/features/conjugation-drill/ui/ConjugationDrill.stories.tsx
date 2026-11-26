import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { getVerbs } from '@/entities/verb';
import { ConjugationDrill } from './ConjugationDrill';

/** Тренажёр спряжения: случайная клетка «глагол × время × форма × лицо». */
const meta = {
  title: 'Фичи/Тренажёр спряжения',
  component: ConjugationDrill,
  args: { verbs: getVerbs(['grafo', 'diavazo', 'akouo']), onGoalReached: fn() },
} satisfies Meta<typeof ConjugationDrill>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Свободно: Story = { name: 'Свободная тренировка' };
export const СЦелью: Story = { name: 'С целью: 10 ответов', args: { goal: 10 } };
export const ТолькоНастоящее: Story = { name: 'Только настоящее, утверждение', args: { tenses: ['present'], forms: ['affirmative'], goal: 5 } };
