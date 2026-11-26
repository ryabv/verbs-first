import type { Meta, StoryObj } from '@storybook/react-vite';
import { chaptersDone, dailyMonth, streak } from '@sb/fixtures';
import { TodayPage } from './TodayPage';

const story = chaptersDone(2);
const built = (month: string) => ({ id: `museum:${month}`, value: 'built' });

/**
 * Ежедневные (/today): календарь месяца и музей — сосуд месяца собирается из черепков закрытых дней
 * (docs/product/daily.md, amphorae.md). «Сегодня» — 24 ноября 2026, запуск — 1 ноября.
 */
const meta = {
  title: 'Экраны/Ежедневные/Календарь',
  component: TodayPage,
  parameters: { layout: 'fullscreen', shell: 'app', route: { path: '/today', url: '/today' }, db: { story_progress: story } },
} satisfies Meta<typeof TodayPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Начало: Story = { name: 'Первый день: ничего не закрыто' };
export const Середина: Story = {
  name: 'Середина месяца: 15 черепков, серия 5',
  parameters: { db: { story_progress: story, daily_days: dailyMonth('2026-11', 15, 3), activity_days: streak(5) } },
};
export const ВсеДни: Story = {
  name: 'Все открытые дни закрыты',
  parameters: { db: { story_progress: story, daily_days: dailyMonth('2026-11', 24), activity_days: streak(24) } },
};

/** «Сегодня» — 10 января 2027: ноябрь собран, декабрь закрыт весь — можно собрать, январь идёт. */
const W = '2027-01-10';
const winter = {
  today: W,
  db: {
    story_progress: story,
    daily_days: [...dailyMonth('2026-11', 30, 0, W), ...dailyMonth('2026-12', 31, 4, W), ...dailyMonth('2027-01', 6, 0, W)],
    settings: [built('2026-11')],
  },
};
export const МузейСобратьСосуд: Story = {
  name: 'Музей: прошлый месяц — собрать сосуд',
  parameters: { ...winter, route: { path: '/today', url: '/today?month=2026-12' } },
};
export const МузейСобран: Story = {
  name: 'Музей: сосуд собран',
  parameters: { ...winter, route: { path: '/today', url: '/today?month=2026-11' } },
};
export const МузейТекущий: Story = { name: 'Музей: текущий месяц', parameters: winter };
export const МузейНедобран: Story = {
  name: 'Музей: месяц кончился, черепков не все',
  parameters: {
    today: W,
    route: { path: '/today', url: '/today?month=2026-12' },
    db: { story_progress: story, daily_days: [...dailyMonth('2026-11', 30, 0, W), ...dailyMonth('2026-12', 18, 0, W)], settings: [built('2026-11')] },
  },
};
export const Телефон: Story = {
  globals: { viewport: { value: 'phone' } },
  parameters: { db: { story_progress: story, daily_days: dailyMonth('2026-11', 15, 3), activity_days: streak(5) } },
};
