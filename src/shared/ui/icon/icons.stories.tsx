import type { Meta, StoryObj } from '@storybook/react-vite';
import * as icons from './icons';

/** Все иконки: линейные, в цвет текста. */
const meta = { title: 'Общее/Иконки' } satisfies Meta;
export default meta;

export const Все: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
      {Object.entries(icons).map(([name, Icon]) => (
        <figure key={name} style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <Icon size={32} style={{ color: 'var(--text)' }} />
          {name}
        </figure>
      ))}
    </div>
  ),
};
