import type { Meta, StoryObj } from '@storybook/react-vite';
import { STORY_CHAPTERS } from '@/entities/story';
import { chaptersDone, storyProgress } from '@sb/fixtures';
import { ChapterRoute } from './ChapterPage';

const ch1 = STORY_CHAPTERS[0]!;
const at = (url: string, path = '/story/:chapterId/:step') => ({ route: { path, url } });

/** Глава «Истории» (/story/N/…): страница главы, шаги, замок, конец главы, рассказ кота. */
const meta = {
  title: 'Экраны/История/Глава',
  component: ChapterRoute,
  parameters: { layout: 'fullscreen', shell: 'app', ...at('/story/1', '/story/:chapterId') },
} satisfies Meta<typeof ChapterRoute>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Обложка: Story = { name: 'Глава: начало' };
export const ОбложкаВПроцессе: Story = { name: 'Глава: прочитано 5 шагов', parameters: { db: { story_progress: storyProgress({ steps: { 1: 5 } }) } } };
export const ОбложкаЗакреплена: Story = { name: 'Глава: закреплена на среднем', parameters: { db: { story_progress: storyProgress({ ranks: { 1: 2 }, cat: [1] }) } } };
export const Шаг: Story = { name: 'Шаг 1', parameters: at('/story/1/1') };
export const ШагСПроверкой: Story = {
  name: 'Шаг с вопросом (середина главы)',
  parameters: at(`/story/1/${ch1.steps.findIndex((s, i) => i > 2 && s.check) + 1}`),
};
export const ШагПоследний: Story = { name: 'Последний шаг', parameters: at(`/story/1/${ch1.steps.length}`) };
export const Конец: Story = { name: 'Конец главы: конспект и находка', parameters: { ...at('/story/1/end'), db: { story_progress: storyProgress({ read: [1] }) } } };
export const Замок: Story = { name: 'Глава закрыта', parameters: at('/story/3', '/story/:chapterId') };
export const РассказКота: Story = {
  name: 'Рассказ кота',
  parameters: { ...at(`/story/1/cat/${ch1.branches?.[0]?.id ?? ''}`, '/story/:chapterId/cat/:branch'), db: { story_progress: storyProgress({ read: [1] }) } },
};
export const НетГлавы: Story = { name: 'Нет такой главы', parameters: at('/story/99', '/story/:chapterId') };
export const ВтораяГлава: Story = { name: 'Глава 2 (после главы 1)', parameters: { ...at('/story/2', '/story/:chapterId'), db: { story_progress: chaptersDone(1) } } };
