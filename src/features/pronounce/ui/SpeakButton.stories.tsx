import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpeakButton } from './SpeakButton';

/** Озвучка греческим голосом (mp3 из public/audio). */
const meta = { title: 'Фичи/Озвучка', component: SpeakButton, args: { text: 'Καλημέρα!' } } satisfies Meta<typeof SpeakButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Кнопка: Story = {};
export const СПодписью: Story = { name: 'С подписью', args: { label: 'Послушать' } };
