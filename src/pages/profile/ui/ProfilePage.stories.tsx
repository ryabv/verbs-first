import type { Meta, StoryObj } from '@storybook/react-vite';
import { chaptersDone, dailyMonth, storyProgress } from '@sb/fixtures';
import { ProfilePage } from './ProfilePage';

/** Профиль (/profile): «Коллекция» — музейный зал (находки, сосуды, медальоны глав) и настройки. */
const meta = {
  title: 'Экраны/Профиль',
  component: ProfilePage,
  parameters: { layout: 'fullscreen', shell: 'app', route: { path: '/profile', url: '/profile' } },
} satisfies Meta<typeof ProfilePage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Пусто: Story = { name: 'Коллекция пуста' };
export const Начало: Story = {
  name: 'Первые медальоны и находки',
  parameters: { db: { story_progress: storyProgress({ ranks: { 1: 1, 2: 2 }, read: [3] }), daily_days: dailyMonth('2026-11', 12) } },
};
export const ЭпохаЗолото: Story = {
  name: 'Эпоха 1 — золото, сосуд собран',
  parameters: {
    today: '2026-12-05',
    db: {
      story_progress: chaptersDone(4, 3),
      daily_days: [...dailyMonth('2026-11', 30, 0, '2026-12-05'), ...dailyMonth('2026-12', 4, 0, '2026-12-05')],
      settings: [{ id: 'museum:2026-11', value: 'built' }],
    },
  },
};
export const Телефон: Story = {
  globals: { viewport: { value: 'phone' } },
  parameters: { db: { story_progress: storyProgress({ ranks: { 1: 1, 2: 2 }, read: [3] }), daily_days: dailyMonth('2026-11', 12) } },
};
