import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { streakOf, useCards } from '@/entities/card';
import { vesselOfMonth, VesselPicture, VesselStage, type VesselView } from '@/entities/vessel';
import { Word } from '@/features/card-add';
import {
  DAILY_DEMO,
  DAILY_START,
  dailyDay,
  dayState,
  dayTitle,
  daysOfMonth,
  monthOf,
  monthSummary,
  monthTitle,
  setMuseumDemo,
  setMuseumDemoMonth,
  shiftMonth,
  assemble,
  todayKey,
  useDailyDays,
  useAssembledMonths,
  weekdayOf,
  type DailyDayRecord,
  type DayState,
} from '@/features/daily';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { Arrow, Laurel } from '@/shared/ui/ornament';
import styles from './Daily.module.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const STATE_LABELS: Record<DayState, string> = { empty: 'не начат', started: 'начат', closed: 'закрыт', clean: 'закрыт чисто' };
const ACTION: Record<DayState, string> = { empty: 'Начать', started: 'Продолжить', closed: 'Повторить', clean: 'Повторить' };
/** Доля заданий дня, на которые уже ответили (решено или «Показать ответ»). */
function partOf(day: DailyDayRecord | undefined): number {
  if (!day?.tasks.length) return 0;
  return Math.min(1, new Set([...day.solved, ...day.revealed]).size / day.tasks.length);
}
const MUSEUM_DECK = { id: 'museum', title: 'Музей сосудов' };
const days = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;

/** Экспонат месяца: пока не собран — стол с найденными черепками, собран — сосуд на постаменте. */
function viewOf(month: string, all: readonly DailyDayRecord[], today: string, built: boolean): VesselView {
  const { found, total, complete } = monthSummary(month, all, today);
  const vessel = vesselOfMonth(month);
  return built && complete ? { kind: 'vessel', vessel } : { kind: 'dig', vessel, found, total };
}

/** /today — ежедневные: сосуд месяца в музее, полка месяцев, календарь, задания на сегодня. */
export function TodayPage() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const first = monthOf(DAILY_START);
  const last = monthOf(today);
  const asked = params.get('month') ?? '';
  const month = /^\d{4}-\d{2}$/.test(asked) && asked >= first && asked <= last ? asked : last;
  const all = useDailyDays();
  const { days: activity } = useCards();
  const streak = streakOf(activity);
  const summary = monthSummary(month, all, today);
  // Выбранный в календаре день — его открывает кнопка; по умолчанию сегодня.
  const [picked, setPicked] = useState(today);
  const pickedState = dayState(dailyDay(picked));
  const pickedDone = pickedState === 'closed' || pickedState === 'clean';
  const go = (m: string) => setParams(m === last ? {} : { month: m });
  // Только в разработке: `?demo=on` / `?demo=off` — демо музея за несколько месяцев (запуск сдвигается, нужна перезагрузка).
  const demo = process.env.NODE_ENV !== 'production' ? params.get('demo') : null;
  useEffect(() => {
    if (demo !== 'on' && demo !== 'off') return;
    setMuseumDemo(demo === 'on');
    // Записи в базу уходят асинхронно — перезагружаемся чуть позже.
    const t = setTimeout(() => window.location.replace(window.location.pathname), 400);
    return () => clearTimeout(t);
  }, [demo]);

  const months: string[] = [];
  for (let m = first; m <= last; m = shiftMonth(m, 1)) months.push(m);
  const [built = false] = useAssembledMonths([month]);
  const dates = daysOfMonth(month);
  const blanks = weekdayOf(dates[0]!);

  return (
    <div className={`${styles.page} ${styles.todayPage}`}>
      <Museum month={month} months={months} all={all} today={today} go={go} />
      {DAILY_DEMO && <DemoPanel month={month} open={summary.open.length} total={summary.total} closed={summary.closed} built={built} />}

      {months.length > 1 && (
        <nav className={styles.shelf} aria-label="Полка: сосуды по месяцам">
          {months.map((m) => (
            <ShelfItem key={m} month={m} all={all} today={today} current={m === month} onPick={() => go(m)} />
          ))}
        </nav>
      )}

      <section className={styles.month} aria-label={`Дни: ${monthTitle(month)}`}>
        <div className={styles.monthHead}>
          <h2 className={styles.monthTitle}>{monthTitle(month)}</h2>
          <span className={styles.counter} title="Закрыто дней">
            <Laurel className={styles.counterLaurel} />
            {summary.closed}/{summary.total}
          </span>
        </div>

        <div className={styles.grid}>
          {WEEKDAYS.map((d) => (
            <span key={d} className={styles.weekday}>
              {d}
            </span>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {dates.map((d) => {
            const n = Number(d.slice(8));
            if (d < DAILY_START) return <span key={d} />;
            if (d > today) {
              return (
                <span key={d} className={`${styles.cell} ${styles.future}`} aria-label={`${dayTitle(d)}: ещё не наступил`}>
                  {n}
                </span>
              );
            }
            const record = all.find((x) => x.id === d);
            const state = dayState(record);
            const done = state === 'closed' || state === 'clean';
            const cls = [styles.cell, styles.day, done && styles.done, state === 'started' && styles.started, d === picked && styles.picked, d === today && styles.today]
              .filter(Boolean)
              .join(' ');
            const label = `${dayTitle(d)}: ${STATE_LABELS[state]}`;
            return (
              <button
                key={d}
                type="button"
                className={cls}
                style={{ '--part': partOf(record) } as CSSProperties}
                onClick={() => setPicked(d)}
                aria-pressed={d === picked}
                aria-label={label}
                title={label}
              >
                {done && <Laurel className={styles.dayLaurel} size="100%" />}
                <span className={styles.dayNum}>{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className={styles.play}>
        <p className={styles.playNote}>
          {picked !== today
            ? `${dayTitle(picked)}${pickedDone ? ': закрыт' : ''}`
            : pickedDone
              ? 'Сегодня закрыто — можно догнать прошлые дни'
              : `Сегодня, ${dayTitle(today)}: 8 заданий на 5–10 минут`}
          {streak > 0 && ` · серия ${days(streak)}`}
        </p>
        <Link to={routes.day(picked)} className={styles.playBtn}>
          {ACTION[pickedState]}
        </Link>
      </div>
    </div>
  );
}

/** Витрина месяца: стол реставратора с найденными черепками; все найдены — собрать сосуд; собран — табличка. */
function Museum({ month, months, all, today, go }: { month: string; months: readonly string[]; all: readonly DailyDayRecord[]; today: string; go: (m: string) => void }) {
  const builtAll = useAssembledMonths(months);
  const focus = months.indexOf(month);
  const first = months[0]!;
  const last = months.at(-1)!;
  // Все месяцы — одна галерея: при смене месяца камера идёт вдоль стены к его экспонату.
  const exhibits = months.map((m, i) => viewOf(m, all, today, builtAll[i] ?? false));
  const view = exhibits[focus]!;
  const summary = monthSummary(month, all, today);
  const vessel = vesselOfMonth(month);
  const left = summary.total - summary.closed;

  const label =
    view.kind === 'vessel' ? vessel.title : `Стол реставратора: найдено ${shards(summary.closed)} из ${summary.total}`;

  return (
    <section className={styles.hero} aria-labelledby="museum-title">
      <div className={styles.stageWrap}>
        <VesselStage exhibits={exhibits} focus={focus} reveal={view.kind === 'vessel' && assembling.has(month)} onRevealed={() => assembling.delete(month)} label={label} className={styles.stage} />
        {/* Телефон: заголовок витрины — прямо на ней, без таблички (кроме «Собрать сосуд»). */}
        <div className={styles.caption} aria-hidden="true">
          <p className={styles.captionKicker}>Музей · {monthTitle(month)}</p>
          <p className={styles.captionTitle}>{view.kind === 'vessel' ? vessel.title : summary.complete ? 'Все черепки найдены' : `Найдено ${summary.closed} из ${shards(summary.total)}`}</p>
        </div>
        <button type="button" className={`${styles.heroArrow} ${styles.heroPrev}`} disabled={month <= first} onClick={() => go(shiftMonth(month, -1))} aria-label="Прошлый месяц">
          <Arrow direction="left" />
        </button>
        <button type="button" className={`${styles.heroArrow} ${styles.heroNext}`} disabled={month >= last} onClick={() => go(shiftMonth(month, 1))} aria-label="Следующий месяц">
          <Arrow />
        </button>
      </div>

      <div className={`${styles.plaque} ${view.kind === 'dig' && summary.complete ? styles.plaqueAction : ''}`}>
        <p className={styles.plaqueKicker}>Музей · {monthTitle(month)}</p>
        {view.kind === 'vessel' ? (
          <>
            <h1 id="museum-title" className={styles.plaqueTitle}>
              {vessel.title}
            </h1>
            <p className={styles.plaqueWhere}>
              <Word greek={vessel.greek} russian={vessel.russian} deck={MUSEUM_DECK} /> · {vessel.where}
            </p>
            <p className={styles.plaqueText}>{vessel.fact}</p>
          </>
        ) : summary.complete ? (
          <>
            <h1 id="museum-title" className={styles.plaqueTitle}>
              Все черепки найдены
            </h1>
            <p className={styles.plaqueText}>Закрыты все {days(summary.total)} месяца — можно собрать сосуд.</p>
            <button
              type="button"
              className={styles.playBtn}
              onClick={() => {
                assembling.add(month);
                assemble(month);
              }}
            >
              Собрать сосуд
            </button>
          </>
        ) : (
          <div className={styles.teaser}>
            <VesselPicture vessel={vessel} kind="silhouette" fill={summary.closed / summary.total} className={styles.silhouette} />
            <div>
              <h1 id="museum-title" className={styles.plaqueTitle}>
                Найдено {summary.closed} из {shards(summary.total)}
              </h1>
              <p className={styles.plaqueText}>
                {summary.ended
                  ? `Похоже, это ${vessel.teaser}. Не хватает ${shards(left)} — догоните пропущенные дни, и сосуд можно будет собрать.`
                  : `Похоже, это ${vessel.teaser}. Каждый закрытый день — ещё один черепок; найдутся все — сосуд можно будет собрать.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const shards = (n: number) => `${n} ${plural(n, ['черепка', 'черепков', 'черепков'])}`;

/** Только в разработке (демо музея): сколько дней закрыто в месяце, разобрать сосуд обратно. */
function DemoPanel({ month, open, total, closed, built }: { month: string; open: number; total: number; closed: number; built: boolean }) {
  const set = (n: number) => setMuseumDemoMonth(month, Math.min(open, n), built && n === total);
  const presets: [string, number][] = [
    ['0', 0],
    ['треть', Math.ceil(total / 3)],
    ['все без одного', total - 1],
    ['все', total],
  ];
  return (
    <div className={styles.demo}>
      <p className={styles.demoTitle}>
        Демо · закрыто {closed} из {total}
        {open < total && ` (по сегодня — ${open})`}
      </p>
      <input type="range" min={0} max={open} value={closed} onChange={(e) => set(Number(e.target.value))} aria-label="Закрыто дней" className={styles.demoRange} />
      <div className={styles.demoRow}>
        {presets.map(([label, n]) => (
          <button key={label} type="button" className={styles.demoBtn} onClick={() => set(n)} disabled={n > open}>
            {label}
          </button>
        ))}
        {built && (
          <button type="button" className={styles.demoBtn} onClick={() => setMuseumDemoMonth(month, closed, false)}>
            разобрать
          </button>
        )}
        <a className={styles.demoBtn} href="?demo=off">
          выключить демо
        </a>
      </div>
    </div>
  );
}

/** Месяцы, чей сосуд собрали только что: показать сборку (один раз). */
const assembling = new Set<string>();

/** Экспонат на полке месяцев. */
function ShelfItem({ month, all, today, current, onPick }: { month: string; all: readonly DailyDayRecord[]; today: string; current: boolean; onPick: () => void }) {
  const [built = false] = useAssembledMonths([month]);
  const view = viewOf(month, all, today, built);
  // Картинки, а не 3D: собран — портрет с росписью, нет — силуэт, залитый по найденным черепкам.
  const fill = view.kind === 'dig' ? view.found.length / view.total : 1;
  return (
    <button type="button" className={styles.shelfItem} aria-pressed={current} onClick={onPick}>
      <VesselPicture vessel={view.vessel} kind={view.kind === 'vessel' ? 'photo' : 'silhouette'} fill={fill} className={styles.shelfThumb} />
      <span>{monthTitle(month)}</span>
    </button>
  );
}
