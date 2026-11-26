import type { Meta, StoryObj } from '@storybook/react-vite';
import { READING_COURSE } from '@/entities/alphabet';
import { AlphabetPage } from './AlphabetPage';
import { StressRules } from './StressRules';

const at = (url: string, path = '/alphabet') => ({ route: { path, url } });
const step = (n: number) => at(`/alphabet/${n}`, '/alphabet/:step');
const done = (n: number) => ({ lesson_progress: [{ id: 'reading', completed: READING_COURSE.steps.slice(0, n).map((s) => s.id) }] });

/** Пролог «Греческий алфавит» (/alphabet) в формате глав: оглавление, шаги подряд, заметки Анны, справочник. */
const meta = {
  title: 'Экраны/Пролог: алфавит',
  component: AlphabetPage,
  parameters: { layout: 'fullscreen', shell: 'app', ...at('/alphabet') },
} satisfies Meta<typeof AlphabetPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Оглавление: Story = { name: 'Оглавление: начало' };
export const ОглавлениеВПроцессе: Story = { name: 'Оглавление: пройдено 10 шагов', parameters: { db: done(10) } };
export const ОглавлениеПройдено: Story = { name: 'Оглавление: всё пройдено', parameters: { db: { ...done(READING_COURSE.steps.length), exam_results: [{ id: 'alphabet', best: 95, passed: true }] } } };
export const Шаг: Story = { name: 'Шаг: буквы (с заметкой Анны)', parameters: step(1) };
const kindStep = (kind: string, name: string): Story => ({ name, parameters: step(READING_COURSE.steps.findIndex((x) => x.kind === kind) + 1) });
export const ШагСлоги = kindStep('syllables', 'Шаг: слоги');
export const ШагЛесенка = kindStep('ladder', 'Шаг: лесенка');
export const ШагСобрать = kindStep('build', 'Шаг: собрать слово');
export const ШагТекст = kindStep('text', 'Шаг: текст');
export const ШагПорядок = kindStep('order', 'Шаг: порядок букв');
export const ШагЭкзамен = kindStep('exam', 'Шаг: экзамен');
export const Заметка: Story = { name: 'Заметка Анны', parameters: at('/alphabet/note/beta', '/alphabet/note/:note') };
export const Справочник: Story = { parameters: at('/alphabet?mode=reference') };
export const Ударение: Story = { name: 'Правила ударения', render: () => <StressRules /> };
