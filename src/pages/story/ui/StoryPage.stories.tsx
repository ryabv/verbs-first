import type { Meta, StoryObj } from '@storybook/react-vite';
import { chaptersDone, storyProgress } from '@sb/fixtures';
import { StoryPage } from './StoryPage';

const SEEN = { 'verbs-first:story-intro-seen': '1' };

/** Карта «Истории» (/island): остров, главы, карточка главы, находки. Телефон — переключатель Viewport. */
const meta = {
  title: 'Экраны/История/Карта',
  component: StoryPage,
  parameters: { layout: 'fullscreen', shell: 'app', route: { path: '/island', url: '/island' }, storage: SEEN },
} satisfies Meta<typeof StoryPage>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Первый вход: вступление поверх карты. */
export const ПервыйВход: Story = { name: 'Первый вход (вступление)', parameters: { storage: {} } };
export const Начало: Story = { name: 'Начало: ничего не прочитано' };
export const ГлаваЧитается: Story = { name: 'Глава 1 читается (4 шага)', parameters: { db: { story_progress: storyProgress({ steps: { 1: 4 } }) } } };
export const ДвеГлавы: Story = { name: 'Главы 1–2 прочитаны, 1 закреплена', parameters: { db: { story_progress: storyProgress({ ranks: { 1: 1 }, read: [2] }) } } };
export const ЭпохаЗакреплена: Story = { name: 'Эпоха 1 закреплена (все находки)', parameters: { db: { story_progress: chaptersDone(4, 2) } } };
export const Телефон: Story = {
  globals: { viewport: { value: 'phone' } },
  parameters: { db: { story_progress: storyProgress({ ranks: { 1: 1 }, read: [2] }) } },
};
