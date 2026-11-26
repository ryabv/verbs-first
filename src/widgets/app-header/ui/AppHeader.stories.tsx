import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppFooter } from '@/widgets/app-footer';
import { AppHeader } from './AppHeader';
import { StudyFan } from './StudyFan';

/**
 * Шапка: на компьютере — меню сверху, на телефоне — нижнее меню с кнопкой «Учёба» (веер зон).
 * Активный пункт — по адресу (`parameters.route`). Телефон — переключатель Viewport.
 */
const meta = {
  title: 'Виджеты/Шапка',
  component: AppHeader,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Главная: Story = { parameters: { route: { path: '/', url: '/' } } };
export const Учёба: Story = { name: 'Учёба: История', parameters: { route: { path: '/island', url: '/island' } } };
export const Профиль: Story = { parameters: { route: { path: '/profile', url: '/profile' } } };
export const Телефон: Story = { parameters: { route: { path: '/', url: '/' } }, globals: { viewport: { value: 'phone' } } };
export const Веер: Story = {
  name: 'Веер «Учёба» (телефон)',
  globals: { viewport: { value: 'phone' } },
  render: () => (
    <div style={{ height: '100vh' }}>
      <StudyFan current="story" closing={false} onClose={fn()} />
    </div>
  ),
};
export const Подвал: Story = { render: () => <AppFooter /> };
