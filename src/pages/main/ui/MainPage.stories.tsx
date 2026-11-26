import type { Meta, StoryObj } from '@storybook/react-vite';
import { cards, chaptersDone, dailyMonth, SAMPLE_WORDS, storyProgress, streak } from '@sb/fixtures';
import { MainPage } from './MainPage';

/** Главная (/): приветствие, пословица дня, серия, прогресс по зонам учёбы (docs/product/home.md). */
const meta = {
  title: 'Экраны/Главная',
  component: MainPage,
  parameters: { layout: 'fullscreen', shell: 'app', route: { path: '/', url: '/' } },
} satisfies Meta<typeof MainPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Новичок: Story = { name: 'Новый ученик: пролог или глава 1' };
export const ПрологИдёт: Story = {
  name: 'Пролог в процессе',
  parameters: { db: { lesson_progress: [{ id: 'reading', completed: ['r1-letters', 'r1-syllables', 'r1-ladder', 'r1-listen', 'r1-build', 'r2-letters'] }] } },
};
export const ВПроцессе: Story = {
  name: 'Глава 2 читается, серия 3, карточки',
  parameters: {
    db: {
      story_progress: storyProgress({ ranks: { 1: 1 }, steps: { 2: 3 } }),
      daily_days: dailyMonth('2026-11', 10),
      activity_days: streak(3),
      cards: cards(SAMPLE_WORDS, 3),
    },
  },
};
export const ДеньЗакрыт: Story = {
  name: 'Ежедневные на сегодня сделаны',
  parameters: { db: { story_progress: chaptersDone(3, 2), daily_days: dailyMonth('2026-11', 24), activity_days: streak(24), cards: cards(SAMPLE_WORDS, 8) } },
};
export const Телефон: Story = {
  globals: { viewport: { value: 'phone' } },
  parameters: { db: { story_progress: storyProgress({ ranks: { 1: 1 }, steps: { 2: 3 } }), activity_days: streak(3) } },
};
