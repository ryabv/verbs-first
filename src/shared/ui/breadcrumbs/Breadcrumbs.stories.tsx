import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumbs } from './Breadcrumbs';

/** На компьютере — цепочка; на телефоне — круглая стрелка «назад» к последнему разделу со ссылкой. */
const meta = {
  title: 'Общее/Breadcrumbs',
  component: Breadcrumbs,
  args: {
    items: [{ label: 'История', to: '/island' }, { label: 'Глава 1', to: '/story/1' }, { label: 'Закрепление' }],
  },
} satisfies Meta<typeof Breadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Цепочка: Story = {};
export const Телефон: Story = { globals: { viewport: { value: 'phone' } } };
/** Раздел из нижнего меню: на телефоне крошек нет. */
export const БезСтрелки: Story = { name: 'Без стрелки «назад»', args: { back: false, items: [{ label: 'Тексты' }] } };
