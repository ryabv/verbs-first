import type { Meta, StoryObj } from '@storybook/react-vite';
import { speak } from '@/shared/lib/speech';
import { AudioPlayer } from './AudioPlayer';

/** Плеер в углу: бледный, пока ничего не звучит; нажмите «Озвучить» — кольцо прогресса и пауза. */
const meta = { title: 'Виджеты/Плеер озвучки', component: AudioPlayer, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof AudioPlayer>;
export default meta;

export const Плеер: StoryObj<typeof meta> = {
  render: () => (
    <div style={{ height: '100vh', padding: 24 }}>
      <button type="button" onClick={() => void speak('Η Άννα ταξιδεύει στην Κύπρο.')}>
        Озвучить фразу
      </button>
      <AudioPlayer />
    </div>
  ),
};
