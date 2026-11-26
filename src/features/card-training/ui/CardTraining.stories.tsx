import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useCards } from '@/entities/card';
import { cards, SAMPLE_WORDS } from '@sb/fixtures';
import { MODES, type Mode } from '../model/settings';
import { CardQuestion } from './CardQuestion';
import { CardTrainer } from './CardTrainer';

/** Тренировка карточек: выбор режима, вопрос в каждом режиме, «всё повторено». */
const meta = {
  title: 'Фичи/Тренировка карточек',
  parameters: { db: { cards: cards(SAMPLE_WORDS) } },
} satisfies Meta;
export default meta;
type Story = StoryObj;

function Trainer() {
  const { cards: all } = useCards();
  return <CardTrainer pool={all} allCards={all} />;
}
function Question({ mode }: { mode: Mode }) {
  const { cards: all } = useCards();
  return all[0] ? <CardQuestion card={all[0]} pool={all} allCards={all} settings={MODES[mode].settings} onResult={fn()} /> : null;
}

export const Начало: Story = { name: 'Начало: выбор режима', render: () => <Trainer /> };
export const ВсёПовторено: Story = {
  name: 'Всё повторено на сегодня',
  parameters: { db: { cards: cards(SAMPLE_WORDS, SAMPLE_WORDS.length, Date.parse('2026-12-01')) } },
  render: () => <Trainer />,
};
export const НетКарточек: Story = { name: 'Нет карточек', parameters: { db: { cards: [] } }, render: () => <Trainer /> };
export const Карточки: Story = { name: 'Вопрос: карточки', render: () => <Question mode="flip" /> };
export const Вспоминаю: Story = { name: 'Вопрос: вспоминаю', render: () => <Question mode="recall" /> };
export const Узнаю: Story = { name: 'Вопрос: узнаю', render: () => <Question mode="recognize" /> };
export const НаСлух: Story = { name: 'Вопрос: на слух', render: () => <Question mode="listen" /> };
export const Пишу: Story = { name: 'Вопрос: пишу', render: () => <Question mode="write" /> };
