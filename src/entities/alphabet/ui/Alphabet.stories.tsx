import type { Meta, StoryObj } from '@storybook/react-vite';
import { COMBINATIONS } from '../data/combinations';
import { READING_COURSE } from '../data/course';
import { LETTERS } from '../data/letters';
import { CombinationList } from './CombinationList';
import { LetterGrid } from './LetterGrid';
import { LetterIntroList } from './LetterIntroList';

/** Алфавит: таблица букв, сочетания, знакомство с буквами этапа курса чтения. */
const meta = { title: 'Сущности/Алфавит' } satisfies Meta;
export default meta;
type Story = StoryObj;

const firstLetters = READING_COURSE.steps.find((s) => s.kind === 'letters');

export const Буквы: Story = { render: () => <LetterGrid letters={LETTERS} /> };
export const Сочетания: Story = { render: () => <CombinationList combinations={COMBINATIONS} /> };
export const БуквыЭтапа: Story = {
  name: 'Буквы этапа (курс чтения)',
  render: () => (firstLetters?.kind === 'letters' ? <LetterIntroList letters={firstLetters.letters} /> : <p>Нет этапа с буквами</p>),
};
