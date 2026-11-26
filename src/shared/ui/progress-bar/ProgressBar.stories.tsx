import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Общее/ProgressBar',
  component: ProgressBar,
  args: { value: 0.4 },
  argTypes: { value: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } },
} satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Начало: Story = { args: { value: 0 } };
export const Середина: Story = {};
export const Готово: Story = { args: { value: 1 } };
export const Тонкая: Story = { args: { thin: true } };
