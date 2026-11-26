import type { Meta, StoryObj } from '@storybook/react-vite';
import { READING_COURSE } from '@/entities/alphabet';
import { AlphabetPage } from './AlphabetPage';
import { StressRules } from './StressRules';

const at = (url: string) => ({ route: { path: '/alphabet', url } });
const done = (n: number) => ({ lesson_progress: [{ id: 'reading', completed: READING_COURSE.steps.slice(0, n).map((s) => s.id) }] });

/** Урок 0 — курс чтения (/alphabet): карта этапов, шаги, справочник алфавита. */
const meta = {
  title: 'Экраны/Курс чтения',
  component: AlphabetPage,
  parameters: { layout: 'fullscreen', shell: 'app', ...at('/alphabet') },
} satisfies Meta<typeof AlphabetPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Карта: Story = { name: 'Карта: начало' };
export const КартаВПроцессе: Story = { name: 'Карта: пройдено 10 шагов', parameters: { db: done(10) } };
export const КартаПройдено: Story = { name: 'Карта: всё пройдено', parameters: { db: { ...done(READING_COURSE.steps.length), exam_results: [{ id: 'alphabet', best: 95, passed: true }] } } };
export const Шаг: Story = { name: 'Шаг: буквы', parameters: at(`/alphabet?step=${READING_COURSE.steps[0]!.id}`) };
const kindStep = (kind: string, name: string): Story => {
  const s = READING_COURSE.steps.find((x) => x.kind === kind);
  return { name, parameters: at(`/alphabet?step=${s?.id ?? ''}`) };
};
export const ШагСлоги = kindStep('syllables', 'Шаг: слоги');
export const ШагЛесенка = kindStep('ladder', 'Шаг: лесенка');
export const ШагСобрать = kindStep('build', 'Шаг: собрать слово');
export const ШагТекст = kindStep('text', 'Шаг: текст');
export const ШагПорядок = kindStep('order', 'Шаг: порядок букв');
export const ШагЭкзамен = kindStep('exam', 'Шаг: экзамен');
export const Справочник: Story = { parameters: at('/alphabet?mode=reference') };
export const Ударение: Story = { name: 'Правила ударения', render: () => <StressRules /> };
