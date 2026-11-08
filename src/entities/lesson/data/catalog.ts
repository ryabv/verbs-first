import type { LessonCatalogItem } from '../model/types';

const titles: [string, string][] = [
  ['Алгоритм греческого глагола', 'Знакомство'],
  ['Глаголы с особым прошедшим', 'Профессии'],
  ['Существительное и движение', 'Город и транспорт'],
  ['Хочу / могу / надо + να', 'Кафе и таверна'],
  ['Глаголы группы Β1 (-άω)', 'Семья'],
  ['Глаголы группы Β2 (-ώ)', 'Внешность, цвета'],
  ['Глаголы на -ομαι', 'Мой день'],
  ['Местоимения-дополнения', 'Общение'],
  ['Длительный вид', 'Увлечения, детство'],
  ['Повелительное наклонение', 'Как пройти'],
  ['Безличные конструкции', 'Самочувствие, погода'],
  ['Перфект', 'Путешествия'],
  ['Сравнение и количество', 'Еда, рынок'],
  ['Сложные предложения', 'Работа, планы'],
  ['Слова-параметры', 'Дом'],
  ['Вежливость и итог', 'Документы'],
];

export function buildCatalog(counts: Map<number, { steps: number; homework: number }>): LessonCatalogItem[] {
  return titles.map(([title, topic], i) => {
    const id = i + 1;
    const { steps: stepCount = 0, homework: homeworkCount = 0 } = counts.get(id) ?? {};
    return { id, title, topic, available: stepCount > 0, stepCount, homeworkCount };
  });
}
