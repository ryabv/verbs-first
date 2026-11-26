import type { Meta, StoryObj } from '@storybook/react-vite';
import sb from '@sb/sb.module.css';
import { STORY_CHAPTERS } from '../data/chapters';
import type { LevelRank } from '../model/progress';
import type { StoryFind } from '../model/types';
import { ChapterMedal } from './ChapterMedal';
import { FindIcon } from './FindIcon';
import { FindThumb, FindViewer } from './FindModel';
import { FindShelf, type ShelfFind } from './FindShelf';

/** «История»: медальоны глав, находки (docs/product/finds.md, collection.md). */
const meta = { title: 'Сущности/История' } satisfies Meta;
export default meta;
type Story = StoryObj;

const ICONS: StoryFind['icon'][] = ['letter', 'photo', 'map', 'tape', 'key', 'figurine', 'notebook'];
const finds: ShelfFind[] = STORY_CHAPTERS.flatMap((c) => (c.find ? [{ chapter: c.id, find: c.find }] : []));
const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 } as const;

/** Пусто, бронза, серебро, золото; глава ещё не написана — «?». */
export const МедальоныГлав: Story = {
  name: 'Медальоны глав',
  render: () => (
    <div style={{ ...row, padding: 24, background: 'var(--hall-wall)', borderRadius: 16 }}>
      {([0, 1, 2, 3] as LevelRank[]).map((r) => (
        <ChapterMedal key={r} chapter={r + 1} rank={r} />
      ))}
      <ChapterMedal chapter={30} rank={0} written={false} />
      <ChapterMedal chapter={7} rank={3} size="8rem" />
    </div>
  ),
};

export const НаходкиПлоские: Story = {
  name: 'Находки: иконки (без WebGL)',
  render: () => (
    <div style={row}>
      {ICONS.map((icon) => (
        <div key={icon} className={sb.fit} style={{ width: 64, height: 64 }}>
          <FindIcon icon={icon} />
        </div>
      ))}
    </div>
  ),
};

export const НаходкиМиниатюры: Story = {
  name: 'Находки: 3D-миниатюры',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 120px)', gap: 16 }}>
      {ICONS.map((icon) => (
        <figure key={icon} style={{ margin: 0, display: 'grid', gap: 4, fontSize: 12, textAlign: 'center' }}>
          <FindThumb icon={icon} />
          {icon}
        </figure>
      ))}
    </div>
  ),
};

export const НаходкаКрупно: StoryObj<{ icon: StoryFind['icon'] }> = {
  name: 'Находка крупно: появление',
  parameters: { layout: 'fullscreen' },
  argTypes: { icon: { control: 'select', options: ICONS } },
  args: { icon: 'figurine' },
  render: ({ icon }) => (
    <div className={sb.fit} style={{ height: '100vh', background: 'var(--reveal-bg)' }}>
      <FindViewer key={icon} icon={icon} reveal />
    </div>
  ),
};

export const Полка: Story = { render: () => <FindShelf finds={finds} planned={finds.length + 4} /> };
export const ПолкаПустая: Story = { name: 'Полка: ничего не найдено', render: () => <FindShelf finds={[]} planned={8} /> };
