import type { Meta, StoryObj } from '@storybook/react-vite';
import { STORY_CHAPTERS } from '@/entities/story';
import { storyProgress } from '@sb/fixtures';
import { PracticePage } from './PracticePage';

const chapter = STORY_CHAPTERS[0]!;

/**
 * Закрепление главы (/story/N/practice): начинается с лёгкого, пройденный уровень — дальше следующий; последнее задание уровня — экран медальона.
 */
const meta = {
  title: 'Экраны/История/Закрепление',
  component: PracticePage,
  args: { chapter },
  parameters: {
    layout: 'fullscreen',
    shell: 'app',
    route: { path: '/story/:chapterId/:step', url: '/story/1/practice' },
    db: { story_progress: storyProgress({ read: [1] }) },
  },
} satisfies Meta<typeof PracticePage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Лёгкий: Story = { name: 'Лёгкий: начало' };
export const ПослеЛёгкого: Story = { name: 'Лёгкий пройден → средний', parameters: { db: { story_progress: storyProgress({ ranks: { 1: 1 } }) } } };
export const ПослеСреднего: Story = { name: 'Средний пройден → сложный', parameters: { db: { story_progress: storyProgress({ ranks: { 1: 2 } }) } } };
export const Пройдено: Story = { name: 'Всё пройдено — повторный круг на сложном', parameters: { db: { story_progress: storyProgress({ ranks: { 1: 3 } }) } } };

/** Шаг назад: на среднем все задания круга пропущены — в итоге предложение пройти главу полегче. */
export const ШагНазад: Story = {
  name: 'Средний не идёт → «попробовать на лёгком»',
  parameters: { db: { story_progress: storyProgress({ ranks: { 1: 1 } }) } },
  play: async ({ canvas, userEvent }) => {
    // Клики — по очереди: каждый следующий ждёт новое задание.
    await chapter.practice.reduce(
      (prev) => prev.then(async () => userEvent.click(await canvas.findByRole('button', { name: 'Пропустить' }))),
      Promise.resolve(),
    );
  },
};

/** Задание посложнее: три верных ответа подряд на лёгком — четвёртое задание на среднем, с пометкой «Посложнее». */
export const Посложнее: Story = {
  name: 'Три верных подряд → задание посложнее',
  play: async ({ canvas, userEvent }) => {
    // Первые три задания главы 1 — пропуски с вариантами; ответы — по очереди.
    const words = chapter.practice.slice(0, 3).flatMap((t) => (t.kind === 'gap' ? [t.word] : []));
    await words.reduce(
      (prev, word) =>
        prev.then(async () => {
          await userEvent.click(await canvas.findByRole('button', { name: word }));
          await userEvent.click(await canvas.findByRole('button', { name: /Дальше/ }));
        }),
      Promise.resolve(),
    );
  },
};
