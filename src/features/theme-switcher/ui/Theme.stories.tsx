import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeChoice } from './ThemeChoice';
import { ThemeSwitcher } from './ThemeSwitcher';

/** Тема: переключатель в шапке и выбор в настройках Профиля. */
const meta = { title: 'Фичи/Тема' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Переключатель: Story = { render: () => <ThemeSwitcher /> };
export const ВыборВНастройках: Story = { name: 'Выбор в настройках', render: () => <ThemeChoice /> };
