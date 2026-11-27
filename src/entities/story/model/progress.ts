import { useSyncExternalStore } from 'react';
import { table, type Rank } from '@/shared/lib/db';
import { STORY_LEVELS, type PracticeTask, type StoryBranch, type StoryChapter, type StoryLevel, type StorySentence } from './types';

/**
 * Прогресс истории — таблица `story_progress` (IndexedDB, схема сервера): запись на «главу × ключ», лучший уровень 1…3.
 * Ключи:
 * - id шага — шаг прочитан (уровень не важен, пишется 3);
 * - END — глава дочитана до конца;
 * - `p:<id>` — задание закрепления сделано на этом уровне (сложное засчитывается и на лёгких: храним лучший);
 * - `cat:<id>` — рассказ кота прочитан.
 * Для страниц — тот же вид, что и раньше: { [глава]: { [ключ]: уровень } }.
 */
export const STORY_END = 'end';
/** Ответвление (рассказ кота) прочитано — хранится в прогрессе главы под этим id. */
export const branchKey = (branchId: string) => `cat:${branchId}`;
/** Задание закрепления сделано — хранится в прогрессе главы под этим id. */
export const practiceKey = (task: PracticeTask) => `p:${task.id}`;

/** 0 — не пройден, 1 — лёгкий, 2 — средний, 3 — сложный. */
export type LevelRank = 0 | 1 | 2 | 3;
export const levelRank = (level: StoryLevel): LevelRank => (STORY_LEVELS.indexOf(level) + 1) as LevelRank;

type ChapterLevels = Readonly<Record<string, LevelRank>>;
type Progress = Readonly<Record<string, ChapterLevels>>;

const rows = table('story_progress');
type StoryProgressRecord = ReturnType<typeof rows.all>[number];
/** Что это за ключ — отдельным полем (схема), чтобы на сервере считать воронку без разбора строк. */
const kindOf = (key: string): StoryProgressRecord['kind'] =>
  key === STORY_END ? 'end' : key.startsWith('p:') ? 'practice' : key.startsWith('cat:') ? 'branch' : 'step';

let built: { from: readonly StoryProgressRecord[]; progress: Progress } | null = null;

function snapshot(): Progress {
  const all = rows.all();
  if (built?.from === all) return built.progress;
  const out: Record<string, Record<string, LevelRank>> = {};
  for (const r of all) (out[r.chapter] ??= {})[r.key] = r.rank;
  built = { from: all, progress: out };
  return out;
}

/** Шаг пройден на уровне level (по умолчанию — на любом: чтение одинаково на всех уровнях). Хранится лучший. */
export function markStoryStep(chapterId: number, stepId: string, level: StoryLevel = 'hard'): void {
  const rank = levelRank(level);
  if ((snapshot()[chapterId]?.[stepId] ?? 0) >= rank) return;
  rows.put({ id: `${chapterId}:${stepId}`, chapter: chapterId, key: stepId, kind: kindOf(stepId), rank: rank as Rank });
}

const EMPTY: ChapterLevels = {};

/** Лучшие уровни шагов главы (реактивно). */
export function useStoryLevels(chapterId: number): ChapterLevels {
  const progress = useSyncExternalStore(rows.subscribe, snapshot, snapshot);
  return progress[chapterId] ?? EMPTY;
}

/** Прогресс всех глав (реактивно). */
export function useStoryProgress(): Progress {
  return useSyncExternalStore(rows.subscribe, snapshot, snapshot);
}

/** Шаги, пройденные на уровне level или сложнее (и END, если глава дочитана). */
export function doneAt(levels: ChapterLevels, level: StoryLevel): string[] {
  const rank = levelRank(level);
  return Object.entries(levels)
    .filter(([id, r]) => r >= rank || id === STORY_END)
    .map(([id]) => id);
}

/** Глава дочитана до конца. */
export function chapterRead(levels: ChapterLevels): boolean {
  return (levels[STORY_END] ?? 0) >= 1;
}

/**
 * Прочитанные предложения главы: дочитана — все; иначе — куски прочитанных шагов. Для того, что глава приносит
 * по мере чтения (слова в карточки, фразы с ними): непрочитанный кусок — непройденные слова и времена.
 */
export function readSentences(chapter: StoryChapter, levels: ChapterLevels): StorySentence[] {
  const read = readSentenceNumbers(chapter, levels);
  return chapter.sentences.filter((_, i) => read.has(i + 1));
}

/** Номера (с 1) прочитанных предложений главы. */
export function readSentenceNumbers(chapter: StoryChapter, levels: ChapterLevels): Set<number> {
  const all = chapter.sentences.map((_, i) => i + 1);
  if (chapterRead(levels)) return new Set(all);
  const read = chapter.steps.filter((s) => (levels[s.id] ?? 0) >= 1);
  return new Set(all.filter((n) => read.some((s) => n >= s.sentences[0] && n <= s.sentences[1])));
}

/** Уровень закрепления главы — самый низкий из уровней её заданий: 0, пока хоть одно не сделано. */
export function chapterRank(chapter: StoryChapter, levels: ChapterLevels): LevelRank {
  return chapter.practice.reduce<LevelRank>((min, t) => Math.min(min, levels[practiceKey(t)] ?? 0) as LevelRank, 3);
}

/**
 * Уровень закрепления главы: первый не пройденный (лёгкий → средний → сложный). Всё пройдено — сложный (повторный круг).
 * Настройки уровня нет (docs/product/modes.md): глава всегда начинается с лёгкого.
 */
export function chapterLevel(chapter: StoryChapter, levels: ChapterLevels): StoryLevel {
  const next = Math.min(3, chapterRank(chapter, levels) + 1);
  return STORY_LEVELS[next - 1]!;
}

/** Рассказ кота прочитан. */
export function branchRead(branch: StoryBranch, levels: ChapterLevels): boolean {
  return (levels[branchKey(branch.id)] ?? 0) >= 1;
}

/**
 * Глава открыта: первая — всегда; внутри эпохи — когда прошлая глава прочитана; первая глава новой эпохи —
 * когда все главы прошлой эпохи закреплены хотя бы на лёгком (порог эпохи).
 */
export function chapterOpen(chapter: StoryChapter, chapters: readonly StoryChapter[], progress: Progress): boolean {
  const i = chapters.findIndex((c) => c.id === chapter.id);
  if (i <= 0) return true;
  const prev = chapters[i - 1]!;
  if (!chapterRead(progress[prev.id] ?? EMPTY)) return false;
  return prev.epoch === chapter.epoch || epochClosed(prev.epoch, chapters, progress);
}

/** Эпоха закрыта: все её главы закреплены хотя бы на лёгком. */
export function epochClosed(epoch: number, chapters: readonly StoryChapter[], progress: Progress): boolean {
  return chapters.filter((c) => c.epoch === epoch).every((c) => chapterRank(c, progress[c.id] ?? EMPTY) >= 1);
}

/** Главы эпохи, которые ещё не закреплены хотя бы на лёгком. */
export function unpracticed(epoch: number, chapters: readonly StoryChapter[], progress: Progress): StoryChapter[] {
  return chapters.filter((c) => c.epoch === epoch && chapterRank(c, progress[c.id] ?? EMPTY) < 1);
}
