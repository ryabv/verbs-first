import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useCards, type Stage } from '@/entities/card';
import { cards, SAMPLE_WORDS, sampleSentences, srsOf } from '@sb/fixtures';
import { CardQuestion } from './CardQuestion';
import { CardTrainer, Finish } from './CardTrainer';

/** Первое слово — то, что встречается в главах (το λιμάνι в главах нет): видно фразы. */
const WORDS = [SAMPLE_WORDS[1]!, ...SAMPLE_WORDS.filter((_, i) => i !== 1)];

/** Тренировка карточек: план на сегодня, ступени слова (знакомство → узнать → вспомнить → написать), «всё повторено». */
const meta = {
  title: 'Фичи/Тренировка карточек',
  parameters: { db: { cards: cards(WORDS) } },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const sentences = sampleSentences();

function Trainer() {
  const { cards: all } = useCards();
  return <CardTrainer pool={all} allCards={all} sentences={sentences} />;
}
function Question({ stage }: { stage: Stage }) {
  const { cards: all } = useCards();
  return all[0] ? <CardQuestion card={all[0]} sentences={sentences} allCards={all} stage={stage} onMeet={fn()} onAnswer={fn()} onNext={fn()} /> : null;
}

/** Слова, которые уже учили: стабильность растёт — ступень строже. */
const learning = (stability: number) => ({
  db: { cards: cards(WORDS).map((c, i) => (i === 0 ? Object.assign(c, { met: 0, srs: srsOf(stability) }) : c)) },
});

export const Начало: Story = { name: 'План на сегодня', render: () => <Trainer /> };
export const Сессия: Story = {
  name: 'Сессия: новое слово',
  render: () => <Trainer />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Начать/ }));
  },
};
/** Итог сессии: 8 карточек, 6 с первого раза; три новых, два слова стали прочнее, одно выучено, неделя — 3 дня подряд. */
function FinishDemo() {
  const { cards: all } = useCards();
  const growth = { met: all.slice(5, 8), stronger: [{ card: all[1]!, stage: 'recall' as const }, { card: all[2]!, stage: 'write' as const }], learned: all.slice(0, 1) };
  return <Finish firstTry={6} total={8} growth={growth} missed={all.slice(3, 5)} pool={all} onMore={fn()} onExit={fn()} />;
}
export const Итог: Story = {
  name: 'Итог сессии',
  parameters: { db: { cards: cards(WORDS, 3, Date.parse('2026-11-25')), activity_days: [{ id: '2026-11-22' }, { id: '2026-11-23' }, { id: '2026-11-24' }] } },
  render: () => <FinishDemo />,
};
export const ВсёПовторено: Story = {
  name: 'Всё повторено на сегодня',
  parameters: { db: { cards: cards(WORDS, WORDS.length, Date.parse('2026-12-01')) } },
  render: () => <Trainer />,
};
export const НетКарточек: Story = { name: 'Нет карточек', parameters: { db: { cards: [] } }, render: () => <Trainer /> };
export const Знакомство: Story = { name: 'Ступень 1: знакомство', render: () => <Question stage="intro" /> };
export const Узнать: Story = { name: 'Ступень 2: узнать во фразе', parameters: learning(1), render: () => <Question stage="recognize" /> };
export const Вспомнить: Story = { name: 'Ступень 3: вспомнить в пропуске', parameters: learning(6), render: () => <Question stage="recall" /> };
export const Написать: Story = { name: 'Ступень 4: написать', parameters: learning(20), render: () => <Question stage="write" /> };
