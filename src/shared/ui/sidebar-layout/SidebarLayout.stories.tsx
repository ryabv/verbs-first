import type { Meta, StoryObj } from '@storybook/react-vite';
import { SidebarLayout, SidebarSection } from './SidebarLayout';

const meta = {
  title: 'Общее/SidebarLayout',
  component: SidebarLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    sidebar: (
      <SidebarSection title="Темы">
        <p>Глаголы</p>
        <p>Артикли</p>
      </SidebarSection>
    ),
    children: (
      <article>
        <h1>Настоящее время</h1>
        <p>Колонка статьи справа от сайдбара.</p>
      </article>
    ),
  },
} satisfies Meta<typeof SidebarLayout>;
export default meta;

export const Раскладка: StoryObj<typeof meta> = {};
