import type { Meta, StoryObj } from '@storybook/react-vite';
import { Callout } from './Callout';

const meta = {
  title: 'Общее/Callout',
  component: Callout,
  args: { title: 'Запомните', children: 'Окончание глагола говорит, кто действует: γράφω — я пишу, γράφεις — ты пишешь.' },
} satisfies Meta<typeof Callout>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Справка: Story = {};
export const Успех: Story = { args: { kind: 'ok', title: 'Получилось', children: 'Все формы верные.' } };
export const Предупреждение: Story = { args: { kind: 'warn', title: 'Внимание', children: 'Ударение здесь смещается.' } };
export const БезЗаголовка: Story = { name: 'Без заголовка', args: { title: undefined } };
