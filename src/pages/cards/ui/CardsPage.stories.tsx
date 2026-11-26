import type { Meta, StoryObj } from '@storybook/react-vite';
import { cards, SAMPLE_WORDS, streak } from '@sb/fixtures';
import { CardsPage } from './CardsPage';

const withCards = { cards: cards(SAMPLE_WORDS, 3), activity_days: streak(4) };

/** Карточки (/cards): наборы, тренировка, набор целиком (?deck=…). */
const meta = {
  title: 'Экраны/Карточки',
  component: CardsPage,
  parameters: { layout: 'fullscreen', shell: 'app', route: { path: '/cards', url: '/cards' } },
} satisfies Meta<typeof CardsPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Пусто: Story = { name: 'Карточек нет' };
export const СКарточками: Story = { name: 'С карточками', parameters: { db: withCards } };
export const Набор: Story = { name: 'Набор «Мои слова»', parameters: { db: withCards, route: { path: '/cards', url: '/cards?deck=my-words' } } };
export const Телефон: Story = { globals: { viewport: { value: 'phone' } }, parameters: { db: withCards } };
