import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GreekKeyboard } from './GreekKeyboard';

const meta = {
  title: 'Общее/GreekKeyboard',
  component: GreekKeyboard,
  args: { open: true, onToggle: fn(), onKey: fn(), onBackspace: fn() },
} satisfies Meta<typeof GreekKeyboard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Открыта: Story = {};
export const Свёрнута: Story = { args: { open: false } };
