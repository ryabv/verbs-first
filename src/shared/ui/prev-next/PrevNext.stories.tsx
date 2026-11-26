import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PrevNext } from './PrevNext';

const meta = {
  title: 'Общее/PrevNext',
  component: PrevNext,
  args: {
    prev: { label: 'Назад', title: 'Анна в порту', onClick: fn() },
    next: { label: 'Дальше', title: 'Письмо', onClick: fn() },
  },
} satisfies Meta<typeof PrevNext>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Обе: Story = {};
export const ТолькоДальше: Story = { name: 'Только «дальше»', args: { prev: undefined } };
export const Закрыто: Story = {
  name: 'Дальше закрыто',
  args: { next: { label: 'Дальше', title: 'Письмо', onClick: fn(), disabled: true, hint: 'Сначала ответьте на вопрос' } },
};
