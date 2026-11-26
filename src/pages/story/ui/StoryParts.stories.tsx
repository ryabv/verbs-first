import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { STORY_CHAPTERS, STORY_PLACES } from '@/entities/story';
import { CatIcon } from './CatIcon';
import { ChapterTitle } from './ChapterTitle';
import { Fireworks } from './Fireworks';
import { Manuscript } from './Manuscript';
import { PlaceImage } from './PlaceImage';
import { Rich } from './Rich';
import { StoryMap, type PlaceState } from './StoryMap';
import { StoryText } from './StoryText';
import { TranslateButton } from './TranslateButton';

const ch1 = STORY_CHAPTERS[0]!;

/** Части страниц «Истории». */
const meta = { title: 'Экраны/История/Части' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Заголовок: Story = { name: 'Заголовок главы', render: () => <ChapterTitle chapter={ch1} /> };
export const Рукопись: Story = {
  render: () => (
    <Manuscript chapter={ch1} label="Текст главы">
      <p>Η Άννα είναι από τη Ρωσία.</p>
    </Manuscript>
  ),
};
export const Картинка: Story = { name: 'Картинка места', render: () => (ch1.image ? <PlaceImage image={ch1.image} eager /> : <p>Нет картинки</p>) };
export const Разметка: Story = { name: 'Объяснение шага (Rich)', render: () => <Rich text={ch1.steps[0]!.body[0]!} /> };

/** Текст главы до текущего шага: прочитанное — бледнее, текущий кусок — ярко. */
export const ТекстГлавы: Story = {
  name: 'Текст главы на шаге 4',
  render: () => <StoryText chapter={ch1} step={ch1.steps[3]!} done={ch1.steps.slice(0, 3).map((s) => s.id)} answered={false} />,
};

export const Перевод: Story = {
  name: 'Кнопка «Перевод»',
  render: function Render() {
    const [shown, setShown] = useState(false);
    return <TranslateButton shown={shown} onToggle={() => setShown(!shown)} />;
  },
};

const placeState = (c: number): PlaceState => (c === 1 ? 'done' : c === 2 ? 'current' : c === 3 ? 'open' : 'fog');

/** Плоская карта — запасной вид без WebGL. */
export const ПлоскаяКарта: Story = {
  name: 'Плоская карта (без WebGL)',
  render: () => <StoryMap places={STORY_PLACES} stateOf={placeState} selected={2} onSelect={fn()} />,
};

export const Кот: Story = { name: 'Иконка кота', render: () => <CatIcon size="4rem" /> };

const salute = (power: 'light' | 'medium' | 'hard'): Story => ({
  name: `Салют: ${power}`,
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div style={{ height: '100vh', background: 'var(--reveal-bg)' }}>
      <Fireworks power={power} />
    </div>
  ),
});
export const СалютЛёгкий = salute('light');
export const СалютСредний = salute('medium');
export const СалютСложный = salute('hard');
