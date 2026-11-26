import type { Meta, StoryObj } from '@storybook/react-vite';
import sb from '@sb/sb.module.css';
import { VESSELS } from '../data/catalog';
import type { VesselView } from '../model/types';
import { ShardReveal } from './ShardReveal';
import { ShardThumb } from './ShardThumb';
import { VesselPicture } from './VesselPicture';
import { VesselStage } from './VesselStage';

const vessel = VESSELS[0]!;
const total = 30;

/** Музей ежедневных: сосуд месяца (3D-скан подлинника) — картинкой, черепки, 3D-галерея (docs/product/amphorae.md). */
const meta = { title: 'Сущности/Сосуд' } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Все сосуды каталога — портреты (крутить и приближать — «Осмотр»). */
export const Каталог: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
      {VESSELS.map((v) => (
        <figure key={v.id} style={{ margin: 0, display: 'grid', gap: 6, fontSize: 12, textAlign: 'center' }}>
          <div className={sb.fit} style={{ height: 160 }}>
            <VesselPicture vessel={v} kind="photo" />
          </div>
          {v.title} · {v.month}
        </figure>
      ))}
    </div>
  ),
};

/**
 * Осмотр сосуда в 3D: тянуть вбок — крутится, колесо или щипок — ближе. Сосуд выбирается в панели Controls.
 */
export const Осмотр: StoryObj<{ id: string }> = {
  parameters: { layout: 'fullscreen' },
  args: { id: VESSELS[0]!.id },
  argTypes: {
    id: {
      name: 'Сосуд',
      control: 'select',
      options: VESSELS.map((v) => v.id),
      labels: Object.fromEntries(VESSELS.map((v) => [v.id, `${v.month} · ${v.title}`])),
    },
  },
  render: ({ id }) => {
    const v = VESSELS.find((x) => x.id === id) ?? VESSELS[0]!;
    return (
      <div className={sb.fit} style={{ height: '100vh' }}>
        <VesselStage key={v.id} exhibits={[{ kind: 'vessel', vessel: v }]} focus={0} label={v.title} zoomable />
      </div>
    );
  },
};

export const Силуэт: Story = {
  name: 'Силуэт: заполнение',
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <div key={f} className={sb.fit} style={{ width: 120, height: 160 }}>
          <VesselPicture vessel={vessel} kind="silhouette" fill={f} />
        </div>
      ))}
    </div>
  ),
};

export const Черепки: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {[0, 1, 2, 3, 10, 20, 29].map((i) => (
        <div key={i} className={sb.fit} style={{ width: 72, height: 72 }}>
          <ShardThumb vessel={vessel} index={i} total={total} />
        </div>
      ))}
    </div>
  ),
};

/** Сосуд пошёл по кругу в месяц другой длины: черепки своего месяца (30) склеиваются и режутся на странице заново. */
export const ЧерепкиПеререзка: Story = {
  name: 'Черепки: месяц другой длины (перерезка)',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {[0, 1, 2, 3, 10, 20, 30].map((i) => (
        <div key={i} className={sb.fit} style={{ width: 72, height: 72 }}>
          <ShardThumb vessel={vessel} index={i} total={31} />
        </div>
      ))}
    </div>
  ),
};

export const ЧерепокНайден: Story = {
  name: 'Черепок: появление (3D)',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className={sb.fit} style={{ height: '100vh', background: 'var(--reveal-bg)' }}>
      <ShardReveal vessel={vessel} index={4} total={total} />
    </div>
  ),
};

/** Черепок с двумя материалами (тело и крышка пиксиды) — два выреза текстуры. */
export const ЧерепокДваМатериала: Story = {
  name: 'Черепок: два материала (3D)',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className={sb.fit} style={{ height: '100vh', background: 'var(--reveal-bg)' }}>
      <ShardReveal vessel={VESSELS.find((v) => v.id === 'geo-pyxis')!} index={3} total={31} />
    </div>
  ),
};

const views = (found: number): VesselView[] => [
  { kind: 'dig', vessel, found: Array.from({ length: found }, (_, i) => i), total },
  { kind: 'vessel', vessel: VESSELS[1]! },
];

export const Галерея: Story = {
  name: 'Галерея (3D): стол реставратора',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className={sb.fit} style={{ height: '70vh' }}>
      <VesselStage exhibits={views(12)} focus={0} label="Стол реставратора: 12 черепков" />
    </div>
  ),
};

export const ГалереяСосуд: Story = {
  name: 'Галерея (3D): целый сосуд',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className={sb.fit} style={{ height: '70vh' }}>
      <VesselStage exhibits={views(30)} focus={1} label="Сосуд на постаменте" />
    </div>
  ),
};
