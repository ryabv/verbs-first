/**
 * Календарь ежедневных: даты — строки `2026-11-22` по местному времени (как дни занятий карточек).
 * Контент начинается с DAILY_START — назад дальше не листается.
 */

/** Первый день с ежедневными заданиями — запуск режима. */
export const DAILY_START = '2026-11-01';

/** Дата → `ГГГГ-ММ-ДД` по местному времени. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayKey = () => dateKey(new Date());

/** `ГГГГ-ММ-ДД` → полдень этого дня (полдень — чтобы переход на летнее время не сдвинул дату). */
export function parseDate(key: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return dateKey(d) === key ? d : undefined;
}

/** День доступен: не раньше запуска и не позже сегодня. */
export const dayOpen = (key: string, today = todayKey()) => key >= DAILY_START && key <= today;

/** Месяц — `ГГГГ-ММ`. */
export const monthOf = (key: string) => key.slice(0, 7);

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + by, 1, 12);
  return dateKey(d).slice(0, 7);
}

/** Все дни месяца по порядку. */
export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** День недели: 0 — понедельник … 6 — воскресенье. */
export function weekdayOf(key: string): number {
  return ((parseDate(key)?.getDay() ?? 1) + 6) % 7;
}

/** Дни недели (пн — вс), в которую входит день. */
export function weekOf(key: string): string[] {
  const d = parseDate(key)!;
  const monday = new Date(d);
  monday.setDate(d.getDate() - weekdayOf(key));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return dateKey(x);
  });
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** «Ноябрь 2026». */
export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${MONTHS[m - 1]} ${y}`;
}

/** «22 ноября». */
export function dayTitle(key: string): string {
  const d = parseDate(key);
  return d ? `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}` : key;
}
