import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { STORY_CHAPTERS } from '@/entities/story/data/chapters';
import { chaptersDone } from '@sb/fixtures';
import { Celebration } from './Celebration';

const chapter = STORY_CHAPTERS[0]!;

/** Получение медальона главы (docs/product/collection.md): экран «Забрать», потом карточка с выбором. */
const meta = {
  title: 'Экраны/История/Получение медальона',
  component: Celebration,
  parameters: { layout: 'fullscreen' },
  args: { chapter, level: 'light', fromRank: 0, onClose: fn(), onNextLevel: fn() },
} satisfies Meta<typeof Celebration>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Бронза: Story = {};
export const Серебро: Story = { args: { level: 'medium' } };
export const ЗолотоСразу: Story = { name: 'Золото сразу (без перековки)', args: { level: 'hard' } };
export const ПерековкаВСеребро: Story = { name: 'Перековка: бронза → серебро', args: { level: 'medium', fromRank: 1 } };
export const ПерековкаВЗолото: Story = { name: 'Перековка: серебро → золото', args: { level: 'hard', fromRank: 2 } };
/** Последняя глава эпохи закреплена — эпоха пройдена. */
export const ЭпохаПройдена: Story = {
  name: 'Эпоха пройдена',
  args: { chapter: STORY_CHAPTERS[3]! },
  parameters: { db: { story_progress: chaptersDone(4) } },
};
