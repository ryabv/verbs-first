import type { Meta, StoryObj } from '@storybook/react-vite';
import { getLesson, knownVerbIds } from '@/entities/lesson';
import { getVerbs } from '@/entities/verb';
import { CompositionEditor } from './CompositionEditor';

const lesson = getLesson(1)!;
const { task, sample, checklist } = lesson.topic.presentation;
const DRAFT = 'verbs-first:composition:story';

/** Сочинение: задание, черновик, проверка по списку и образец. */
const meta = {
  title: 'Фичи/Сочинение',
  component: CompositionEditor,
  args: { draftKey: DRAFT, task, sample, checklist, verbs: getVerbs(knownVerbIds(lesson)) },
} satisfies Meta<typeof CompositionEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Пусто: Story = {};
export const Черновик: Story = {
  name: 'С черновиком',
  parameters: { storage: { [DRAFT]: 'Με λένε Άννα. Είμαι από τη Ρωσία. Δουλεύω και διαβάζω πολύ.' } },
};
