import { useSyncExternalStore } from 'react';
import { setting, table, type RecordOf } from '@/shared/lib/db';
import { daysOfMonth, monthOf, todayKey, DAILY_DEMO_KEY, DAILY_START } from './calendar';

/**
 * Прогресс ежедневных — таблица `daily_days` (схема — shared/lib/db/schema.ts): запись на день.
 * Набор заданий фиксируется при первом открытии дня, дальше в записи копятся решённые.
 */
export type DailyDayRecord = RecordOf<'daily_days'>;

const days = table('daily_days');
/** Дни занятий — общие с карточками: серия дней подряд одна. */
const activity = table('activity_days');

export function useDailyDays(): readonly DailyDayRecord[] {
  return useSyncExternalStore(days.subscribe, days.all, days.all);
}

export const dailyDay = (date: string) => days.get(date);

/** Зафиксировать набор заданий дня (если день уже открыт — ничего не меняется). */
export function openDay(date: string, tasks: readonly string[]): void {
  if (days.get(date)) return;
  days.put({ id: date, tasks: [...tasks], solved: [], revealed: [] });
}

/** Задание дня решено: сам или с показанным ответом. Решённое сам не становится «с ответом». */
export function markDailyTask(date: string, key: string, how: 'solved' | 'revealed'): void {
  const day = days.get(date);
  if (!day || day.solved.includes(key) || (how === 'revealed' && day.revealed.includes(key))) return;
  const next = how === 'solved' ? { solved: [...day.solved, key], revealed: day.revealed.filter((k) => k !== key) } : { revealed: [...day.revealed, key] };
  days.put({ ...day, ...next });
  if (!activity.get(todayKey())) activity.put({ id: todayKey() });
}

export type DayState = 'empty' | 'started' | 'closed' | 'clean';

/** Состояние дня: закрыт — решены все задания (с показанным ответом тоже), чисто — без «Показать ответ». */
export function dayState(day: DailyDayRecord | undefined): DayState {
  if (!day || day.tasks.length === 0) return 'empty';
  const done = new Set([...day.solved, ...day.revealed]);
  if (!day.tasks.every((k) => done.has(k))) return day.solved.length + day.revealed.length > 0 ? 'started' : 'empty';
  return day.tasks.some((k) => day.revealed.includes(k)) ? 'closed' : 'clean';
}

export const isClosed = (state: DayState) => state === 'closed' || state === 'clean';

export interface MonthSummary {
  /** Дни месяца, которые уже можно решать (с запуска по сегодня). */
  open: string[];
  /** Всего дней месяца с контентом (с запуска). */
  total: number;
  closed: number;
  /** Номера закрытых дней (с нуля, среди дней месяца с запуска) — у каждого дня свой черепок. */
  found: number[];
  /** Месяц кончился. */
  ended: boolean;
  /** Закрыты все дни месяца — найдены все черепки, сосуд можно собрать (хоть в этом месяце, хоть догнав потом). */
  complete: boolean;
}

export function monthSummary(month: string, all: readonly DailyDayRecord[], today = todayKey()): MonthSummary {
  const byId = new Map(all.map((d) => [d.id, d]));
  const dates = daysOfMonth(month).filter((d) => d >= DAILY_START);
  const open = dates.filter((d) => d <= today);
  const found = open.flatMap((d, i) => (isClosed(dayState(byId.get(d))) ? [i] : []));
  const closed = found.length;
  const ended = month < monthOf(today);
  return { open, total: dates.length, closed, found, ended, complete: dates.length > 0 && closed === dates.length };
}

/** Номер черепка дня: место дня среди дней месяца с запуска (с нуля). */
export function shardOfDay(date: string): number {
  return daysOfMonth(monthOf(date))
    .filter((d) => d >= DAILY_START)
    .indexOf(date);
}

/** Сосуд месяца собирают из черепков один раз — нажатием, когда найдены все; потом он стоит в витрине. */
const ASSEMBLED = ['dig', 'built'] as const;
const assembled = (month: string) => setting(`museum:${month}`, 'dig', ASSEMBLED);
export const assemble = (month: string) => assembled(month).write('built');
/** Какие из месяцев уже собраны — для всей галереи сразу. */export function useAssembledMonths(months: readonly string[]): readonly boolean[] {
  const read = () => months.map((m) => (assembled(m).read() === 'built' ? '1' : '0')).join('');
  const flags = useSyncExternalStore(assembled(months[0] ?? '').subscribe, read, () => '');
  return months.map((_, i) => flags[i] === '1');
}

function fillDemo(month: string, n: number) {
  for (const d of daysOfMonth(month).slice(0, n)) if (!days.get(d)) days.put({ id: d, tasks: ['demo'], solved: ['demo'], revealed: [] });
}

/**
 * Только в разработке: включить/выключить демо музея. При включении — закрытые дни за август (6 черепков),
 * сентябрь (20 из 30) и октябрь (все — можно собрать).
 */
export function setMuseumDemo(on: boolean): void {
  if (process.env.NODE_ENV === 'production') return;
  try {
    if (on) localStorage.setItem(DAILY_DEMO_KEY, 'on');
    else localStorage.removeItem(DAILY_DEMO_KEY);
  } catch {
    return;
  }
  if (!on) return;
  fillDemo('2026-08', 6);
  fillDemo('2026-09', 20);
  fillDemo('2026-10', 31);
}

/**
 * Только в разработке (демо музея): в месяце закрыто ровно `closed` дней с начала (не позже сегодня);
 * `built` — сосуд собран (false — снова черепки в лотке, чтобы ещё раз «собрать»).
 */
export function setMuseumDemoMonth(month: string, closed: number, built: boolean): void {
  if (process.env.NODE_ENV === 'production') return;
  const today = todayKey();
  const dates = daysOfMonth(month).filter((d) => d >= DAILY_START && d <= today);
  dates.forEach((d, i) => {
    if (i < closed) {
      if (!isClosed(dayState(days.get(d)))) days.put({ id: d, tasks: ['demo'], solved: ['demo'], revealed: [] });
    } else if (days.get(d)) days.remove(d);
  });
  assembled(month).write(built ? 'built' : 'dig');
}

const attempts = table('attempts');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Ошибки последней недели до дня `date` — ключи заданий: «Показать ответ» и «Пропустить».
 * Из ежедневных — ключ как есть, из закрепления глав (`глава:id`) — `p:глава:id`.
 */
export function recentMistakes(date: string): string[] {
  const end = new Date(`${date}T23:59:59`).getTime();
  const out = new Set<string>();
  for (const a of attempts.all()) {
    const at = new Date(a.at).getTime();
    if (a.result === 'right' || at > end || at < end - WEEK_MS) continue;
    if (a.source === 'daily') out.add(a.item);
    if (a.source === 'story-practice') out.add(`p:${a.item}`);
  }
  return [...out];
}
