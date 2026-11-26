import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddWordForm } from './AddWordForm';

const meta = { title: 'Фичи/Своё слово', component: AddWordForm } satisfies Meta<typeof AddWordForm>;
export default meta;

export const Форма: StoryObj<typeof meta> = {};
