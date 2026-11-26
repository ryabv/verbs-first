import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PRACTICE_KINDS, STORY_CHAPTERS, STORY_LEVELS, type PracticeTask as Task, type StoryLevel } from '@/entities/story';
import { LevelBadge } from './LevelBadge';
import { PracticeTask } from './PracticeTask';

/**
 * Задания закрепления и ежедневных (реестр PRACTICE_KINDS, docs/product/tasks.md): каждый тип на каждом уровне.
 * Текст и задания — из глав; уровень — в панели «Controls».
 */
const meta = {
  title: 'Виджеты/Задание',
  argTypes: { level: { control: 'inline-radio', options: STORY_LEVELS } },
  args: { level: 'light' },
} satisfies Meta<{ level: StoryLevel }>;
export default meta;
type Story = StoryObj<{ level: StoryLevel }>;

function find(kind: Task['kind']) {
  for (const chapter of STORY_CHAPTERS) {
    const task = chapter.practice.find((t) => t.kind === kind);
    if (task) return { chapter, task };
  }
  return undefined;
}

function Live({ kind, level, solved: start = false }: { kind: Task['kind']; level: StoryLevel; solved?: boolean }) {
  const [solved, setSolved] = useState(start);
  const found = find(kind);
  if (!found) return <p>Нет задания типа {kind}</p>;
  return (
    <PracticeTask
      key={`${level}:${start}`}
      sentences={found.chapter.sentences}
      task={found.task}
      level={level}
      solved={solved}
      onSolved={() => setSolved(true)}
    />
  );
}

const kindStory = (kind: Task['kind']): Story => ({
  name: `${PRACTICE_KINDS[kind].title}`,
  render: ({ level }) => <Live kind={kind} level={level} />,
});

export const Пропуск = kindStory('gap');
export const Нажать = kindStory('tap');
export const Выбрать = kindStory('choose');
export const НаСлух = kindStory('listen');
export const Перевод = kindStory('translate');

/** Решено: поля только для чтения, ответ виден. */
export const Решено: Story = { render: ({ level }) => <Live kind="gap" level={level} solved /> };

/** Все типы на всех уровнях — одним листом. */
export const ВсеТипы: Story = {
  name: 'Все типы × уровни',
  render: () => (
    <div style={{ display: 'grid', gap: 32 }}>
      {(Object.keys(PRACTICE_KINDS) as Task['kind'][]).map((kind) =>
        STORY_LEVELS.map((level) => (
          <section key={`${kind}:${level}`}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 13 }}>
              {PRACTICE_KINDS[kind].title} · {level}
            </h3>
            <Live kind={kind} level={level} />
          </section>
        )),
      )}
    </div>
  ),
};

/** Значок уровня на страницах заданий; подсказка — при наведении (здесь открыта фокусом). */
export const ЗначокУровня: Story = {
  name: 'Значок уровня (закрепление, ежедневные)',
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 200 }}>
      <LevelBadge level="light" />
      <LevelBadge level="medium" passed={1} />
      <LevelBadge level="hard" passed={3} />
      <LevelBadge level="medium" single />
    </div>
  ),
  play: async ({ canvas }) => canvas.getAllByRole('button')[1]?.focus(),
};
