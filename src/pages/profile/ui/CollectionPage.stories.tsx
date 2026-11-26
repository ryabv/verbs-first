import type { Meta, StoryObj } from '@storybook/react-vite';
import { chaptersDone, dailyMonth, storyProgress } from '@sb/fixtures';
import { CollectionPage } from './CollectionPage';

/** «Коллекция» (/profile/collection): вкладки «Сосуды · Находки · Медальоны», сетка картинок; 3D — по нажатию. */
const meta = {
  title: 'Экраны/Коллекция',
  component: CollectionPage,
  parameters: { layout: 'fullscreen', shell: 'app', route: { path: '/profile/collection', url: '/profile/collection' } },
} satisfies Meta<typeof CollectionPage>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Полгода ежедневных: два сосуда собраны, один можно собрать, остальные — черепками. */
const halfYear = {
  today: '2027-04-20',
  db: {
    story_progress: chaptersDone(4, 3),
    daily_days: [
      ...dailyMonth('2026-11', 30, 0, '2027-04-20'),
      ...dailyMonth('2026-12', 31, 0, '2027-04-20'),
      ...dailyMonth('2027-01', 31, 0, '2027-04-20'),
      ...dailyMonth('2027-02', 17, 0, '2027-04-20'),
      ...dailyMonth('2027-03', 25, 0, '2027-04-20'),
      ...dailyMonth('2027-04', 12, 0, '2027-04-20'),
    ],
    settings: [
      { id: 'museum:2026-11', value: 'built' },
      { id: 'museum:2026-12', value: 'built' },
    ],
  },
};

export const Пусто: Story = { name: 'Пока ничего не собрано' };
export const Сосуды: Story = { name: 'Сосуды: полгода', parameters: halfYear };
export const Находки: Story = { parameters: { ...halfYear, route: { path: '/profile/collection', url: '/profile/collection?tab=finds' } } };
export const Медальоны: Story = {
  parameters: { db: { story_progress: storyProgress({ ranks: { 1: 3, 2: 2, 3: 1 }, read: [4] }) }, route: { path: '/profile/collection', url: '/profile/collection?tab=medals' } },
};
export const Телефон: Story = { globals: { viewport: { value: 'phone' } }, parameters: halfYear };
