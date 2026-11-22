import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { markStoryStep, practiceKey, PRACTICE_KINDS, TASK_SKILL_LABELS, useStoryLevel } from '@/entities/story';
import type { DeckRef } from '@/entities/card';
import { ShardThumb, vesselOfMonth } from '@/entities/vessel';
import { AddWords, analyzePhrase, lookupToken } from '@/features/card-add';
import {
  buildDay,
  dayOpen,
  dayState,
  dayTitle,
  isClosed,
  markDailyTask,
  monthSummary,
  shardOfDay,
  monthTitle,
  openDay,
  parseDate,
  recentMistakes,
  todayKey,
  useAssembledMonths,
  useDailyDays,
  weekOf,
  type DailyDayRecord,
  type DailyTask,
} from '@/features/daily';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { logAttempt } from '@/shared/lib/db';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button, buttonClassName } from '@/shared/ui/button';
import { Arrow, Check } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { LevelSwitch, PracticeTask } from '@/widgets/practice-task';
import { FoundShard } from './FoundShard';
import { useDailyPool, useUnpracticed } from '../lib/pool';
import styles from './Daily.module.css';

/** Слова из ошибок дня — в свой набор карточек. */
const DAILY_DECK: DeckRef = { id: 'daily', title: 'Из ежедневных' };
const dailyDeck = () => DAILY_DECK;

/** /today/:date — день: задания одно за другим. */
export function DayRoute() {
  const { date = '' } = useParams();
  if (!parseDate(date) || !dayOpen(date)) {
    return (
      <div className={styles.page}>
        <p>Этот день пока закрыт: задания есть с первого дня запуска и по сегодня.</p>
        <Link to={routes.today()}>
          <Arrow direction="left" /> К календарю
        </Link>
      </div>
    );
  }
  return <DayPage key={date} date={date} />;
}

function DayPage({ date }: { date: string }) {
  const level = useStoryLevel();
  const { read, pool } = useDailyPool();
  const unpracticed = useUnpracticed(level);
  const days = useDailyDays();
  const day = days.find((d) => d.id === date);

  // Набор дня собирается один раз — при первом открытии — и дальше хранится (таблица daily_days).
  useEffect(() => {
    if (day) return;
    const week = new Set(weekOf(date).filter((d) => d !== date));
    const usedThisWeek = new Set(days.filter((d) => week.has(d.id)).flatMap((d) => d.tasks));
    openDay(date, buildDay({ date, pool, current: read.at(-1)?.id, unpracticed, mistakes: recentMistakes(date), usedThisWeek }));
  }, [date, day, days, pool, read, unpracticed]);

  if (!day) return <div className={styles.page} />;
  const tasks = day.tasks.flatMap((k) => pool.get(k) ?? []);
  // Смена уровня — новый круг заданий, как в закреплении главы.
  return <Day key={level} date={date} day={day} tasks={tasks} />;
}

function Day({ date, day, tasks }: { date: string; day: DailyDayRecord; tasks: readonly DailyTask[] }) {
  const level = useStoryLevel();
  const isDone = (t: DailyTask) => day.solved.includes(t.key) || day.revealed.includes(t.key);
  const [queue, setQueue] = useState(() => {
    const left = tasks.filter((t) => !isDone(t));
    return left.length > 0 ? left : tasks;
  });
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  // День был закрыт ещё до этого захода — черепок за него уже найден раньше.
  const [closedBefore] = useState(() => isClosed(dayState(day)));
  // День закрыли в этот заход — праздник с найденным черепком (один раз).
  const [celebrated, setCelebrated] = useState(false);
  const endCelebration = useCallback(() => setCelebrated(true), []);
  const item = queue[index];

  const log = (result: 'right' | 'revealed' | 'skipped') =>
    item && logAttempt({ source: 'daily', item: item.key, kind: item.task.kind, level, result });
  const solve = () => {
    if (!item) return;
    setSolved(true);
    log('right');
    markDailyTask(date, item.key, 'solved');
    // Задание закрепления главы засчитывается и в главе: незакреплённое закрепляется и через ежедневные.
    if (item.group === 'practice') markStoryStep(item.chapter, practiceKey(item.task), level);
  };
  const reveal = () => {
    if (!item) return;
    setSolved(true);
    log('revealed');
    markDailyTask(date, item.key, 'revealed');
    setRevealed((r) => new Set(r).add(item.key));
  };
  const next = () => {
    setSolved(false);
    setIndex((i) => i + 1);
  };
  const again = () => {
    setQueue(tasks.filter((t) => !isDone(t)));
    setIndex(0);
    setSolved(false);
  };

  // Только в разработке: закрыть день одним нажатием — посмотреть экран итога.
  const demoFinish = (how: 'solved' | 'revealed') => {
    for (const t of tasks) markDailyTask(date, t.key, how);
    setIndex(queue.length);
    setSolved(false);
  };

  const doneCount = tasks.filter(isDone).length;
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'Сегодня', to: routes.today(date.slice(0, 7)) }, { label: dayTitle(date) }]} />
        <p className={styles.kicker}>
          {date === todayKey() ? 'Задания на сегодня' : `Задания на ${dayTitle(date)}`}
        </p>
        <LevelSwitch className={styles.levels} />
        <div className={styles.progress}>
          <ProgressBar value={tasks.length ? doneCount / tasks.length : 0} />
          <span>
            {doneCount}/{tasks.length}
          </span>
        </div>
        {process.env.NODE_ENV !== 'production' && item && (
          <div className={styles.demoRow}>
            <span className={styles.demoTitle}>Демо:</span>
            <button type="button" className={styles.demoBtn} onClick={() => demoFinish('solved')}>
              пройти чисто
            </button>
            <button type="button" className={styles.demoBtn} onClick={() => demoFinish('revealed')}>
              пройти с подсказками
            </button>
          </div>
        )}
      </header>

      {item ? (
        <section className={styles.task}>
          <div className={styles.taskHead}>
            <h2 className={styles.taskTitle}>
              {TASK_SKILL_LABELS[PRACTICE_KINDS[item.task.kind].skill]} · {index + 1} из {queue.length}
              <span className={styles.source}> · {item.source}</span>
            </h2>
            {!solved && (
              <button type="button" className={styles.linkBtn} onClick={reveal}>
                Показать ответ
              </button>
            )}
          </div>
          <PracticeTask
            key={item.key}
            sentences={item.sentences}
            task={item.task}
            level={level}
            solved={solved}
            onSolved={solve}
            withTranslation={item.withTranslation}
          />
          {revealed.has(item.key) && <p className={styles.note}>Ответ показан: день закроется, но не «чисто».</p>}
          <div className={styles.nav}>
            {solved ? (
              <Button onClick={next}>
                Дальше <Arrow />
              </Button>
            ) : (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  log('skipped');
                  next();
                }}
              >
                Пропустить
              </button>
            )}
          </div>
        </section>
      ) : (
        <Finish date={date} day={day} tasks={tasks} onAgain={again} fresh={!closedBefore} />
      )}
      {!item && !closedBefore && !celebrated && isClosed(dayState(day)) && <FoundShard date={date} onClose={endCelebration} />}
    </div>
  );
}

function Finish({ date, day, tasks, onAgain, fresh }: { date: string; day: DailyDayRecord; tasks: readonly DailyTask[]; onAgain: () => void; fresh: boolean }) {
  const state = dayState(day);
  const left = tasks.filter((t) => !day.solved.includes(t.key) && !day.revealed.includes(t.key)).length;
  // Слова из заданий с показанным ответом — словарными формами, без служебных слов.
  const words = useMemo(() => {
    const out = new Map<string, { greek: string; russian: string; kind: 'verb' | 'word' }>();
    for (const t of tasks) {
      if (!day.revealed.includes(t.key)) continue;
      for (const token of analyzePhrase(t.phrase.greek)) {
        const e = token.isWord ? lookupToken(token) : undefined;
        if (e && !/артикль|предлог|частица|союз/.test(e.russian) && !out.has(e.greek)) out.set(e.greek, e);
      }
    }
    return [...out.values()];
  }, [tasks, day.revealed]);
  const today = todayKey();
  return (
    <section className={styles.summary}>
      {isClosed(state) ? (
        <h2>
          <Check /> День закрыт{state === 'clean' ? ' — чисто, без подсказок' : ''}
        </h2>
      ) : (
        <>
          <h2>Круг пройден</h2>
          <p>Осталось заданий: {left}. Пропущенные можно сделать ещё раз — день закроется, когда решены все.</p>
        </>
      )}
      {isClosed(state) && <Find date={date} fresh={fresh} />}
      {words.length > 0 && (
        <p>
          <AddWords words={words} deckFor={dailyDeck} label="Слова из ошибок — в карточки" />
        </p>
      )}
      <div className={styles.finishRow}>
        {left > 0 && <Button onClick={onAgain}>Ещё круг</Button>}
        {date !== today && (
          <Link to={routes.day(today)} className={buttonClassName(left > 0 ? 'secondary' : 'primary')}>
            К заданиям на сегодня <Arrow />
          </Link>
        )}
        <Link to={routes.today(date.slice(0, 7))}>
          <Arrow direction="left" /> К календарю
        </Link>
      </div>
    </section>
  );
}

const shards = (n: number) => `${n} ${plural(n, ['черепок', 'черепка', 'черепков'])}`;

/** Музей в итоге дня: закрытый день — найденный черепок сосуда месяца. */
function Find({ date, fresh }: { date: string; fresh: boolean }) {
  const month = date.slice(0, 7);
  const all = useDailyDays();
  const [built = false] = useAssembledMonths([month]);
  const { closed, total, complete } = monthSummary(month, all);
  const vessel = vesselOfMonth(month);
  const left = total - closed;
  const title = built ? 'Сосуд месяца собран' : complete ? 'Все черепки найдены' : fresh ? `Найден черепок — ${closed} из ${total}` : `Черепки месяца — ${closed} из ${total}`;
  const text = built
    ? `${vessel.title} уже стоит в музее.`
    : complete
      ? 'Можно собрать сосуд месяца.'
      : `Похоже, это ${vessel.teaser}. Ещё ${shards(left)} — и сосуд можно будет собрать.`;
  return (
    <div className={styles.find}>
      <ShardThumb vessel={vessel} index={shardOfDay(date)} total={total} className={styles.findImg} />
      <div>
        <p className={styles.findKicker}>Музей · {monthTitle(month)}</p>
        <p className={styles.findTitle}>{title}</p>
        <p className={styles.findText}>{text}</p>
        <Link to={routes.today(month)} className={styles.findLink}>
          {complete && !built ? 'Собрать сосуд' : 'На стол реставратора'} <Arrow />
        </Link>
      </div>
    </div>
  );
}
