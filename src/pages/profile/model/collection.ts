import { chapterRank, chapterRead, getChapter, STORY_CHAPTERS, STORY_PLANNED, useStoryProgress, type LevelRank, type StoryChapter } from '@/entities/story';
import { vesselOfMonth, type Vessel } from '@/entities/vessel';
import { DAILY_START, monthOf, monthSummary, shiftMonth, todayKey, useAssembledMonths, useDailyDays } from '@/features/daily';

export interface VesselItem {
  month: string;
  vessel: Vessel;
  /** Найдено черепков и сколько всего (по дням месяца). */
  found: number;
  total: number;
  /** Все черепки найдены. */
  complete: boolean;
  /** Сосуд собран (черепки все и нажато «Собрать»). */
  built: boolean;
}

export interface FindItem {
  chapter: StoryChapter;
  found: boolean;
}

export interface MedalItem {
  chapter: number;
  epoch: number;
  /** 0 — не закреплена, 1–3 — лёгкий, средний, сложный. */
  rank: LevelRank;
  /** Глава написана (иначе — место под будущую). */
  written: boolean;
}

export interface Collection {
  /** Месяцы ежедневных, свежий первым. */
  vessels: VesselItem[];
  finds: FindItem[];
  medals: MedalItem[];
  counts: Record<'vessels' | 'finds' | 'medals', { got: number; of: number }>;
  total: number;
}

/** Месяцы ежедневных — с первого по текущий. */
function dailyMonths(today: string): string[] {
  const months: string[] = [];
  for (let m = monthOf(DAILY_START); m <= monthOf(today); m = shiftMonth(m, 1)) months.push(m);
  return months;
}

/** Всё собранное — из уже существующего прогресса (docs/product/collection.md). */
export function useCollection(): Collection {
  const story = useStoryProgress();
  const days = useDailyDays();
  const today = todayKey();
  const months = dailyMonths(today);
  const assembled = useAssembledMonths(months);
  const vessels = months
    .map((month, i): VesselItem => {
      const s = monthSummary(month, days, today);
      return { month, vessel: vesselOfMonth(month), found: s.found.length, total: s.total, complete: s.complete, built: Boolean(assembled[i]) && s.complete };
    })
    .toReversed();
  const finds = STORY_CHAPTERS.filter((c) => c.find).map((chapter) => ({ chapter, found: chapterRead(story[chapter.id] ?? {}) }));
  const medals = Array.from({ length: STORY_PLANNED }, (_, i): MedalItem => {
    const id = i + 1;
    const c = getChapter(id);
    return { chapter: id, epoch: Math.floor(i / 4) + 1, rank: c ? chapterRank(c, story[id] ?? {}) : 0, written: Boolean(c) };
  });
  const counts = {
    vessels: { got: vessels.filter((v) => v.built).length, of: vessels.length },
    finds: { got: finds.filter((f) => f.found).length, of: finds.length },
    medals: { got: medals.filter((m) => m.rank > 0).length, of: STORY_PLANNED },
  };
  return { vessels, finds, medals, counts, total: counts.vessels.got + counts.finds.got + counts.medals.got };
}

/** Разложить по группам с сохранением порядка: год, эпоха. */
export function groupBy<T, K>(list: readonly T[], key: (x: T) => K): [K, T[]][] {
  const groups = new Map<K, T[]>();
  for (const x of list) {
    const k = key(x);
    const g = groups.get(k);
    if (g) g.push(x);
    else groups.set(k, [x]);
  }
  return [...groups];
}
