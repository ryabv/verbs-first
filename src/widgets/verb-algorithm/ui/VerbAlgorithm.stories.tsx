import type { Meta, StoryObj } from '@storybook/react-vite';
import { getVerbs } from '@/entities/verb';
import { VerbAlgorithm } from './VerbAlgorithm';

/** Алгоритм глагола: от начальной формы к таблице «время × форма». */
const meta = {
  title: 'Виджеты/Алгоритм глагола',
  component: VerbAlgorithm,
  args: { verbs: getVerbs(['grafo', 'diavazo']) },
} satisfies Meta<typeof VerbAlgorithm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ВсяТаблица: Story = { name: 'Вся таблица' };
export const ТолькоНастоящее: Story = { name: 'Только настоящее (scope)', args: { tenses: ['present'] } };
