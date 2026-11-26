import type { Meta, StoryObj } from '@storybook/react-vite';
import { Amphora, Arrow, Check, Column, Laurel, Meander, Medallion, Owl, Scroll, StageMark, Wreath } from './Ornament';

/** Греческие мотивы интерфейса. */
const meta = { title: 'Общее/Орнамент' } satisfies Meta;
export default meta;
type Story = StoryObj;

const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 } as const;
const cap = { display: 'grid', justifyItems: 'center', gap: 6, margin: 0, fontSize: 12, color: 'var(--text-muted)' } as const;

export const Мотивы: Story = {
  render: () => (
    <div style={row}>
      {Object.entries({ Laurel, Amphora, Owl, Scroll, Column, Check, Arrow }).map(([name, Icon]) => (
        <figure key={name} style={cap}>
          <Icon size="2.5rem" />
          {name}
        </figure>
      ))}
      <figure style={cap}>
        <Wreath>
          <b>7</b>
        </Wreath>
        Wreath
      </figure>
    </div>
  ),
};

export const Меандр: Story = { render: () => <Meander /> };

/** Медальоны этапов урока и знаки карты: получен / не получен. */
export const ЗнакиЭтапов: Story = {
  name: 'Знаки этапов',
  render: () => (
    <div style={{ display: 'grid', gap: 20 }}>
      {[false, true].map((earned) => (
        <div key={String(earned)} style={row}>
          <Medallion n={1} earned={earned} />
          <Medallion n={2} earned={earned} letter="αβ" />
          <StageMark kind="homework" num={1} earned={earned} />
          <StageMark kind="exam" num={1} earned={earned} />
          <StageMark kind="homework" num={2} earned={earned} compact size="2rem" />
          <span style={{ color: 'var(--text-muted)' }}>{earned ? 'получены' : 'не получены'}</span>
        </div>
      ))}
    </div>
  ),
};
