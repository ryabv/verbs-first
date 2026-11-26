import type { Meta, StoryObj } from '@storybook/react-vite';
import { HomePage } from './HomePage';

/** Список уроков (/lessons): из меню убран, открывается по прямой ссылке. */
const meta = {
  title: 'Экраны/Список уроков',
  component: HomePage,
  parameters: { layout: 'fullscreen', shell: 'app', route: { path: '/lessons', url: '/lessons' } },
} satisfies Meta<typeof HomePage>;
export default meta;

export const Список: StoryObj<typeof meta> = {};
