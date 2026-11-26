import type { Meta, StoryObj } from '@storybook/react-vite';
import { getLesson } from '../api/lessonApi';
import { GrammarSectionView } from './GrammarSectionView';
import { PhraseList } from './PhraseList';

const lesson = getLesson(1)!;

/** Урок: раздел грамматики и список фраз темы (данные урока 1). */
const meta = { title: 'Сущности/Урок' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Грамматика: Story = { render: () => <GrammarSectionView section={lesson.grammar[0]!} /> };
export const Фразы: Story = { render: () => <PhraseList phrases={lesson.topic.phrases} /> };
