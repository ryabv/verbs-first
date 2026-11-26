import type { Meta, StoryObj } from '@storybook/react-vite';
import { getLesson } from '@/entities/lesson';
import { ACC_M } from '@/entities/dictionary/data/notes';
import { cards, SAMPLE_WORDS } from '@sb/fixtures';
import { AddToCards } from './AddToCards';
import { AddWords } from './AddWords';
import { LessonWords } from './LessonWords';
import { RichText } from './RichText';
import { WhyNote } from './WhyNote';
import { GreekInline, Phrase, Word } from './Word';
import { WordCard } from './WordCard';
import { DEFAULT_DECK } from '@/entities/card';

const lesson = getLesson(1)!;

/**
 * Слова в карточки: любое греческое слово на сайте нажимается — окно с переводом, «Почему так?» и «В карточки».
 * Нажмите на подчёркнутое слово.
 */
const meta = { title: 'Фичи/Слова в карточки' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Слово: Story = {
  render: () => (
    <p>
      Нажмите: <Word greek="το λιμάνι" russian="порт" display="λιμάνι" />
    </p>
  ),
};
export const СловоПочемуТак: Story = {
  name: 'Слово: «Почему так?»',
  render: () => (
    <p>
      Στο <Word greek="ο σταθμός" russian="вокзал" display="σταθμό" why={ACC_M} />
    </p>
  ),
};
export const Фраза: Story = { render: () => <Phrase greek="Η Άννα ταξιδεύει στην Κύπρο." russian="Анна путешествует на Кипр." /> };
export const ГреческийВТексте: Story = {
  name: 'Греческий внутри русского текста',
  render: () => <GreekInline text="Глагол «ταξιδεύω» — путешествовать. Ημέρα — день." />,
};
export const РазметкаТекста: Story = { name: 'RichText', render: () => <RichText text="**Жирное**, окончание `-ω` и слово γράφω — каждое греческое слово с переводом." /> };
export const ОкноСлова: Story = { name: 'Окно слова (WordCard)', render: () => <WordCard greek="το λιμάνι" russian="порт" display="λιμάνι" why={ACC_M} /> };
export const ОкноСловаВКарточках: Story = {
  name: 'Окно слова: уже в карточках',
  parameters: { db: { cards: cards([['το λιμάνι', 'порт']]) } },
  render: () => <WordCard greek="το λιμάνι" russian="порт" />,
};
export const ВКарточки: Story = { name: 'Кнопка «В карточки»', render: () => <AddToCards greek="βλέπω" russian="видеть, смотреть" /> };
export const ПочемуТак: Story = { name: '«Почему так?»', render: () => <WhyNote why={ACC_M} /> };
const words = SAMPLE_WORDS.slice(0, 4).map(([greek, russian]) => ({ greek, russian, kind: 'word' as const }));
export const НесколькоСлов: Story = {
  name: 'Добавить несколько слов',
  render: () => <AddWords words={words} deckFor={() => DEFAULT_DECK} label="Слова с ошибками — в карточки" />,
};
export const НесколькоСловУже: Story = {
  name: 'Добавить несколько слов: уже добавлены',
  parameters: { db: { cards: cards(SAMPLE_WORDS.slice(0, 4)) } },
  render: () => <AddWords words={words} deckFor={() => DEFAULT_DECK} label="Слова с ошибками — в карточки" />,
};
export const СловаУрока: Story = { name: 'Слова урока', render: () => <LessonWords lesson={lesson} /> };
