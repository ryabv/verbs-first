/**
 * Данные ученика для историй: состояние экрана задаётся снимком базы (`parameters.db`), а не флагами в адресе.
 * Снимок кладётся в память перед каждой историей (`loadSnapshot`), в IndexedDB ничего не пишется.
 */
import { STORY_CHAPTERS } from '@/entities/story/data/chapters';
import { practiceKey, STORY_END } from '@/entities/story/model/progress';
import { daysOfMonth } from '@/features/daily/model/calendar';
import type { Rank, Snapshot } from '@/shared/lib/db';

/** «Сегодня» во всех историях — фиксированное: экраны с датами одинаковы при каждом просмотре. */
export const TODAY = '2026-11-24';

type StoryRow = NonNullable<Snapshot['story_progress']>[number];
const step = (chapter: number, key: string, kind: StoryRow['kind'], rank: Rank): StoryRow => ({
  id: `${chapter}:${key}`,
  chapter,
  key,
  kind,
  rank,
});

/**
 * Прогресс «Истории».
 * - `read` — главы, прочитанные до конца;
 * - `steps` — глава, прочитанная частично: сколько шагов;
 * - `ranks` — закрепление: глава → уровень 1…3 (лёгкий…сложный); глава при этом считается прочитанной;
 * - `cat` — прочитаны все рассказы кота этих глав.
 */
export function storyProgress({
  read = [],
  steps = {},
  ranks = {},
  cat = [],
}: {
  read?: number[];
  steps?: Record<number, number>;
  ranks?: Record<number, Rank>;
  cat?: number[];
}): StoryRow[] {
  const rows: StoryRow[] = [];
  for (const c of STORY_CHAPTERS) {
    const rank = ranks[c.id];
    const full = read.includes(c.id) || rank !== undefined;
    const n = full ? c.steps.length : (steps[c.id] ?? 0);
    c.steps.slice(0, n).forEach((s) => rows.push(step(c.id, s.id, 'step', 3)));
    if (full) rows.push(step(c.id, STORY_END, 'end', 3));
    if (rank) c.practice.forEach((t) => rows.push(step(c.id, practiceKey(t), 'practice', rank)));
    if (cat.includes(c.id)) c.branches?.forEach((b) => rows.push(step(c.id, `cat:${b.id}`, 'branch', 3)));
  }
  return rows;
}

/** Первые `n` глав прочитаны и закреплены на уровне `rank`. */
export const chaptersDone = (n: number, rank: Rank = 1) =>
  storyProgress({ ranks: Object.fromEntries(STORY_CHAPTERS.slice(0, n).map((c) => [c.id, rank])) });

type DayRow = NonNullable<Snapshot['daily_days']>[number];
/**
 * Ежедневные: в месяце закрыты первые `closed` дней (не позже `today`); `revealed` — сколько из них с подсказкой.
 * История с другим `parameters.today` передаёт его и сюда.
 */
export function dailyMonth(month: string, closed: number, revealed = 0, today = TODAY): DayRow[] {
  return daysOfMonth(month)
    .filter((d) => d <= today)
    .slice(0, closed)
    .map((d, i) => ({ id: d, tasks: ['t1', 't2'], solved: i < revealed ? ['t1'] : ['t1', 't2'], revealed: i < revealed ? ['t2'] : [] }));
}

/** Дни занятий подряд до TODAY включительно — серия. */
export function streak(days: number): NonNullable<Snapshot['activity_days']> {
  const out: { id: string }[] = [];
  const d = new Date(`${TODAY}T12:00:00`);
  for (let i = 0; i < days; i++) {
    out.push({ id: d.toISOString().slice(0, 10) });
    d.setDate(d.getDate() - 1);
  }
  return out;
}

type CardRow = NonNullable<Snapshot['cards']>[number];
/**
 * Карточки: слова в «Моих словах»; `learned` — сколько из них уже в долгих коробках,
 * `due` — когда их повторять (по умолчанию — пора).
 */
export function cards(words: [greek: string, russian: string][], learned = 0, due?: number): CardRow[] {
  return words.map(([greek, russian], i) => {
    const srs = i < learned ? { box: 4, seen: 6, due } : { box: 0, seen: 0 };
    return {
      id: `card-${i}`,
      deckIds: ['my-words'],
      greek,
      russian,
      createdAt: 0,
      progress: { 'gr-ru': srs, 'ru-gr': srs },
    };
  });
}

export const SAMPLE_WORDS: [string, string][] = [
  ['το λιμάνι', 'порт'],
  ['το γράμμα', 'письмо'],
  ['η κυρία', 'госпожа'],
  ['ταξιδεύω', 'путешествовать, ездить'],
  ['βλέπω', 'видеть, смотреть'],
  ['το σπίτι', 'дом'],
  ['η θάλασσα', 'море'],
  ['γράφω', 'писать'],
];
