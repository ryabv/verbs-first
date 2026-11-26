import type { Meta, StoryObj } from '@storybook/react-vite';
import { GrammarPage } from './GrammarPage';
import { GrammarTopicPage } from './GrammarTopicPage';

/** Справочник (/grammar): темы → правила с адресом /grammar/тема#правило. */
const meta = {
  title: 'Экраны/Справочник',
  parameters: { layout: 'fullscreen', shell: 'app' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Темы: Story = { parameters: { route: { path: '/grammar', url: '/grammar' } }, render: () => <GrammarPage /> };
const topic = (id: string, name: string): Story => ({
  name,
  parameters: { route: { path: '/grammar/:topicId', url: `/grammar/${id}` } },
  render: () => <GrammarTopicPage />,
});
export const Глагол = topic('verb', 'Тема: глагол');
export const Существительное = topic('noun', 'Тема: существительное');
export const Артикль = topic('article', 'Тема: артикль');
export const НетТемы = topic('nope', 'Нет такой темы');
