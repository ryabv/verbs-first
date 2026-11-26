import type { Meta, StoryObj } from '@storybook/react-vite';
import { chaptersDone, dailyMonth } from '@sb/fixtures';
import { DayRoute } from './DayPage';
import { FoundShard } from './FoundShard';

const story = chaptersDone(2);
const day = (date: string) => ({ route: { path: '/today/:date', url: `/today/${date}` } });

/** День ежедневных (/today/ДАТА): обзор, задания одно за другим, итог; «Найден черепок!». */
const meta = {
  title: 'Экраны/Ежедневные/День',
  component: DayRoute,
  parameters: { layout: 'fullscreen', shell: 'app', ...day('2026-11-24'), db: { story_progress: story } },
} satisfies Meta<typeof DayRoute>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Обзор: Story = { name: 'Сегодня: обзор заданий' };
export const Задания: Story = {
  name: 'Сегодня: задания',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Начать/ }));
  },
};
export const ПройденЧисто: Story = {
  name: 'День пройден чисто',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Начать/ }));
    await userEvent.click(await canvas.findByRole('button', { name: 'пройти чисто' }));
  },
};
export const ПройденСПодсказками: Story = {
  name: 'День пройден с подсказками',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Начать/ }));
    await userEvent.click(await canvas.findByRole('button', { name: 'пройти с подсказками' }));
  },
};
export const Прошлый: Story = { name: 'Прошлый день', parameters: day('2026-11-10') };
export const Закрыт: Story = { name: 'День ещё не открыт', parameters: day('2026-11-30') };
export const НетГлав: Story = { name: 'Нет пройденных глав', parameters: { db: { story_progress: [] } } };

/** Праздник «Найден черепок!» — после последнего задания дня. */
export const Черепок: Story = {
  name: 'Найден черепок',
  parameters: { db: { story_progress: story, daily_days: dailyMonth('2026-11', 24) } },
  render: () => <FoundShard date="2026-11-24" />,
};
export const ПоследнийЧерепок: Story = {
  name: 'Последний черепок месяца — «Собрать сосуд»',
  parameters: { today: '2026-11-30', db: { story_progress: story, daily_days: dailyMonth('2026-11', 30, 0, '2026-11-30') } },
  render: () => <FoundShard date="2026-11-30" />,
};
