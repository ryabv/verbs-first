import type { Meta, StoryObj } from '@storybook/react-vite';
import { LIBRARY_TEXTS } from '@/entities/library';
import { chaptersDone } from '@sb/fixtures';
import { TextPage } from './TextPage';
import { TextsPage } from './TextsPage';

/** Тексты (/texts): список по уровню и один текст с разбором. */
const meta = {
  title: 'Экраны/Тексты',
  parameters: { layout: 'fullscreen', shell: 'app' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Список: Story = { parameters: { route: { path: '/texts', url: '/texts' } }, render: () => <TextsPage /> };
export const СписокПрочитано: Story = {
  name: 'Список: два прочитаны',
  parameters: { route: { path: '/texts', url: '/texts' }, db: { texts_read: LIBRARY_TEXTS.slice(0, 2).map((t) => ({ id: t.id })), story_progress: chaptersDone(4) } },
  render: () => <TextsPage />,
};
export const Текст: Story = {
  parameters: { route: { path: '/texts/:textId', url: `/texts/${LIBRARY_TEXTS[0]!.id}` } },
  render: () => <TextPage />,
};
