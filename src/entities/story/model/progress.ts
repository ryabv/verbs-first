import { useSyncExternalStore } from 'react';
import { STORY_LEVELS, type StoryBranch, type StoryChapter, type StoryLevel } from './types';

/**
 * Прогресс истории по уровням: { [номер главы]: { [id шага]: лучший уровень 1…3 } }.
 * Пройденное на более сложном уровне засчитывается и на всех лёгких: храним только лучший.
 * Отдельный id END — дочитана вся глава. localStorage, синхронизация между вкладками — событие storage.
 */
const KEY = 'verbs-first:story-levels';
/** Старый прогресс без уровней: { [глава]: id шагов } — там пропуски вписывали руками, это средний уровень. */
const LEGACY_KEY = 'verbs-first:story';
const LEVEL_KEY = 'verbs-first:story-level';
export const STORY_END = 'end';
/** Ответвление (рассказ кота) прочитано — хранится в прогрессе главы под этим id. */
export const branchKey = (branchId: string) => `cat:${branchId}`;

/** 0 — не пройден, 1 — лёгкий, 2 — средний, 3 — сложный. */
export type LevelRank = 0 | 1 | 2 | 3;
export const levelRank = (level: StoryLevel): LevelRank => (STORY_LEVELS.indexOf(level) + 1) as LevelRank;

type ChapterLevels = Readonly<Record<string, LevelRank>>;
type Progress = Readonly<Record<string, ChapterLevels>>;
const listeners = new Set<() => void>();
let cache: Progress | null = null;

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

function load(): Progress {
  const out: Record<string, Record<string, LevelRank>> = {};
  const legacy = readJson(LEGACY_KEY);
  if (isObject(legacy)) {
    for (const [chapter, ids] of Object.entries(legacy)) {
      if (!Array.isArray(ids)) continue;
      out[chapter] = Object.fromEntries(ids.filter((x): x is string => typeof x === 'string').map((id) => [id, 2 as LevelRank]));
    }
  }
  const stored = readJson(KEY);
  if (isObject(stored)) {
    for (const [chapter, steps] of Object.entries(stored)) {
      if (!isObject(steps)) continue;
      const merged = { ...out[chapter] };
      for (const [id, rank] of Object.entries(steps)) {
        if (rank === 1 || rank === 2 || rank === 3) merged[id] = Math.max(merged[id] ?? 0, rank) as LevelRank;
      }
      out[chapter] = merged;
    }
  }
  return out;
}

function snapshot(): Progress {
  cache ??= load();
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== LEVEL_KEY) return;
    cache = null;
    level = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const notify = () => listeners.forEach((l) => l());

/** Шаг пройден на уровне level (по умолчанию — на любом: чтение без задачи одинаково на всех уровнях). */
export function markStoryStep(chapterId: number, stepId: string, level: StoryLevel = 'hard'): void {
  const rank = levelRank(level);
  const chapter = snapshot()[chapterId] ?? {};
  if ((chapter[stepId] ?? 0) >= rank) return;
  cache = { ...snapshot(), [chapterId]: { ...chapter, [stepId]: rank } };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* приватный режим — живёт в памяти */
  }
  notify();
}

const EMPTY: ChapterLevels = {};

/** Лучшие уровни шагов главы (реактивно). */
export function useStoryLevels(chapterId: number): ChapterLevels {
  const progress = useSyncExternalStore(subscribe, snapshot, snapshot);
  return progress[chapterId] ?? EMPTY;
}

/** Прогресс всех глав (реактивно). */
export function useStoryProgress(): Progress {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Шаги, пройденные на уровне level или сложнее (и END, если глава дочитана). */
export function doneAt(levels: ChapterLevels, level: StoryLevel): string[] {
  const rank = levelRank(level);
  return Object.entries(levels)
    .filter(([id, r]) => r >= rank || id === STORY_END)
    .map(([id]) => id);
}

/** Уровень главы — самый низкий из уровней её шагов: 0, пока хоть один шаг не пройден. */
export function chapterRank(chapter: StoryChapter, levels: ChapterLevels): LevelRank {
  return chapter.steps.reduce<LevelRank>((min, s) => Math.min(min, levels[s.id] ?? 0) as LevelRank, 3);
}

/** Рассказ кота прочитан. */
export function branchRead(branch: StoryBranch, levels: ChapterLevels): boolean {
  return (levels[branchKey(branch.id)] ?? 0) >= 1;
}

/** Глава открыта: первая — всегда, следующая — когда предыдущая пройдена хотя бы на лёгком. */
export function chapterOpen(id: number, rankOf: (id: number) => LevelRank): boolean {
  return id <= 1 || rankOf(id - 1) >= 1;
}

/* Выбранный уровень — один на всю историю, запоминается. Новичку — лёгкий. */
let level: StoryLevel | null = null;

function levelSnapshot(): StoryLevel {
  if (level) return level;
  const raw = (() => {
    try {
      return localStorage.getItem(LEVEL_KEY);
    } catch {
      return null;
    }
  })();
  level = STORY_LEVELS.find((l) => l === raw) ?? 'light';
  return level;
}

export function useStoryLevel(): StoryLevel {
  return useSyncExternalStore(subscribe, levelSnapshot, levelSnapshot);
}

export function setStoryLevel(next: StoryLevel): void {
  level = next;
  try {
    localStorage.setItem(LEVEL_KEY, next);
  } catch {
    /* не запомнили — выбор живёт до перезагрузки */
  }
  notify();
}
