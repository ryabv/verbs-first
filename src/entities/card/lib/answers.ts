import { compareAnswer, stripAccents, type AnswerVerdict } from '@/shared/lib/greek';

const ARTICLES = new Set(['ο', 'η', 'το', 'οι', 'τα', 'τον', 'την', 'του', 'της']);

/** Варианты греческого ответа: «Γεια σου! / Γεια σας!» → два; «η μουσική» → с артиклем и без. */
export function greekVariants(greek: string): string[] {
  const parts = greek.split('/').map((p) => p.trim()).filter(Boolean);
  const out = new Set(parts);
  for (const part of parts) {
    const [first, ...rest] = part.split(/\s+/);
    if (first && rest.length && ARTICLES.has(stripAccents(first))) out.add(rest.join(' '));
  }
  return [...out];
}

const normalizeRussian = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:«»"'()—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** «читать, учить (уроки)» → ['читать', 'учить']: подходит любое из значений. */
export function russianVariants(russian: string): string[] {
  return russian
    .replace(/\([^)]*\)/g, '')
    .split(/[,;/]/)
    .map(normalizeRussian)
    .filter(Boolean);
}

export function checkGreek(answer: string, greek: string): AnswerVerdict {
  return compareAnswer(answer, greekVariants(greek));
}

export function checkRussian(answer: string, russian: string): AnswerVerdict {
  const given = normalizeRussian(answer);
  if (!given) return 'wrong';
  const variants = russianVariants(russian);
  if (variants.includes(given) || normalizeRussian(russian) === given) return 'correct';
  // Одна опечатка в длинном слове — «почти».
  return variants.some((v) => v.length >= 5 && distance(v, given) <= 1) ? 'accent' : 'wrong';
}

/** Расстояние Левенштейна (для коротких строк). */
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Ключ для поиска дублей: одно и то же греческое слово не добавляем дважды. */
export const cardKey = (greek: string) => stripAccents(greek);
