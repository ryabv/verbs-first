import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { markStoryStep, practiceKey, type StoryLevel } from '@/entities/story';
import { addCards, ensureDeck, meetCard, planToday, recordAnswer, useCards, type Card, type DeckRef } from '@/entities/card';
import { preloadShard, ShardThumb, vesselOfMonth } from '@/entities/vessel';
import { analyzePhrase, lookupToken } from '@/features/card-add';
import { CardQuestion } from '@/features/card-training';
import {
  buildDay,
  DAY_PARTS,
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
  parseCardKey,
  partOf,
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
import { PracticeTask } from '@/widgets/practice-task';
import { useWordSentences } from '@/widgets/word-sentences';
import { FoundShard } from './FoundShard';
import { dayLevels, useDailyLevel, useDailyPool, useUnpracticed } from '../lib/pool';
import styles from './Daily.module.css';

/** Слова из ошибок дня — в свой набор карточек. */
const DAILY_DECK: DeckRef = { id: 'daily', title: 'Из ежедневных' };

/**
 * Задание-карточка (часть «Слова», docs/product/cards.md): слово из карточек ученика — знакомство (`ci:`) или проверка
 * (`c:`, ступень — по прочности слова). Ответ двигает расписание повторений карточки. Карточку удалили — `card` нет.
 */
interface CardItem {
  key: string;
  group: 'word';
  card?: Card;
  intro: boolean;
  source: string;
}
type DayItem = DailyTask | CardItem;
const isCard = (t: DayItem): t is CardItem => !('task' in t);

/** Слова задания — словарными формами, без служебных слов (для карточек из ошибок). Карточка уже в карточках. */
function wordsOf(t: DayItem) {
  if (isCard(t)) return [];
  const out = new Map<string, { greek: string; russian: string }>();
  for (const token of analyzePhrase(t.phrase.greek)) {
    const e = token.isWord ? lookupToken(token) : undefined;
    if (e && !/артикль|предлог|частица|союз/.test(e.russian) && !out.has(e.greek)) out.set(e.greek, { greek: e.greek, russian: e.russian });
  }
  return [...out.values()];
}

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
  const level = useDailyLevel();
  const { read, pool } = useDailyPool();
  const unpracticed = useUnpracticed(level);
  const days = useDailyDays();
  const day = days.find((d) => d.id === date);
  const { cards } = useCards();

  // Набор дня собирается один раз — при первом открытии — и дальше хранится (таблица daily_days).
  useEffect(() => {
    if (day) return;
    const week = new Set(weekOf(date).filter((d) => d !== date));
    const usedThisWeek = new Set(days.filter((d) => week.has(d.id)).flatMap((d) => d.tasks));
    // Часть «Слова» — из карточек: что пора повторить и пара новых (docs/product/cards.md).
    const plan = planToday(cards);
    const own = { due: plan.due.map((c) => c.id), fresh: plan.fresh.map((c) => c.id) };
    openDay(date, buildDay({ date, pool, current: read.at(-1)?.id, unpracticed, mistakes: recentMistakes(date), usedThisWeek, cards: own }));
  }, [date, day, days, pool, read, unpracticed, cards]);

  const tasks = (day?.tasks ?? []).flatMap((k): DayItem[] => {
    const c = parseCardKey(k);
    if (c) return [{ key: k, group: 'word', intro: c.intro, card: cards.find((x) => x.id === c.id), source: 'Карточки' }];
    const t = pool.get(k);
    return t ? [t] : [];
  });

  // День ещё не закрыт — пока ученик решает, в фоне грузим черепок дня (только его): праздник откроется без ожидания.
  const open = day !== undefined && !isClosed(dayState(day));
  const month = date.slice(0, 7);
  const total = open ? monthSummary(month, days).total : 0;
  useEffect(() => (open ? preloadShard(vesselOfMonth(month), shardOfDay(date), total) : undefined), [open, month, date, total]);

  if (!day) return <div className={styles.page} />;
  // Потолок вырос (закреплена глава строже) — новый круг заданий.
  return <Day key={level} date={date} day={day} tasks={tasks} top={level} />;
}

function Day({ date, day, tasks, top }: { date: string; day: DailyDayRecord; tasks: readonly DayItem[]; top: StoryLevel }) {
  // У каждого задания свой уровень: смесь до потолка, большая часть — лёгкие (docs/product/daily.md).
  const levels = useMemo(() => dayLevels(date, tasks.map((t) => t.key), top), [date, tasks, top]);
  const isDone = (t: DayItem) => day.solved.includes(t.key) || day.revealed.includes(t.key);
  const [queue, setQueue] = useState(() => {
    const left = tasks.filter((t) => !isDone(t));
    return left.length > 0 ? left : tasks;
  });
  const [index, setIndex] = useState(0);
  // Сначала — оглавление дня; «Начать» / «Продолжить» ведёт к заданиям.
  const [started, setStarted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  // День был закрыт ещё до этого захода — черепок за него уже найден раньше.
  const [closedBefore] = useState(() => isClosed(dayState(day)));
  // День закрыли в этот заход — праздник с найденным черепком; «Закрыть» уводит на стол реставратора.
  const item = queue[index];
  const level = (item && levels.get(item.key)) ?? 'light';

  const { cards } = useCards();
  const sentences = useWordSentences();
  const log = (result: 'right' | 'revealed' | 'skipped') =>
    item && logAttempt({ source: 'daily', item: item.key, kind: isCard(item) ? 'card' : item.task.kind, level, result });
  const solve = () => {
    if (!item) return;
    setSolved(true);
    log('right');
    markDailyTask(date, item.key, 'solved');
    // Задание закрепления главы засчитывается и в главе: незакреплённое закрепляется и через ежедневные.
    if (!isCard(item) && item.group === 'practice') markStoryStep(item.chapter, practiceKey(item.task), level);
  };
  const reveal = () => {
    if (!item) return;
    setSolved(true);
    log('revealed');
    markDailyTask(date, item.key, 'revealed');
    setRevealed((r) => new Set(r).add(item.key));
    // Показали ответ — слова задания сами идут в карточки (docs/product/home.md).
    ensureDeck(DAILY_DECK);
    addCards(DAILY_DECK.id, wordsOf(item));
  };
  const next = () => {
    setSolved(false);
    setIndex((i) => i + 1);
  };
  // Карточка: ответ двигает её расписание — один раз (повторный круг по закрытому дню расписание не трогает).
  const fresh = item !== undefined && !isDone(item);
  const meet = (sentencesShown: string[]) => {
    if (!item || !isCard(item) || !item.card) return;
    if (fresh) meetCard(item.card.id, sentencesShown);
    solve();
  };
  const answerCard = (correct: boolean, sentence?: string) => {
    if (!item || !isCard(item) || !item.card) return;
    if (fresh) recordAnswer(item.card.id, correct, sentence);
    if (correct) solve();
    else {
      // Ошибка в карточке — ответ показан сам: день закроется, но не «чисто».
      setSolved(true);
      log('revealed');
      markDailyTask(date, item.key, 'revealed');
    }
  };
  const live = item && isCard(item) ? (cards.find((c) => c.id === item.card?.id) ?? item.card) : undefined;
  const again = () => {
    setQueue(tasks.filter((t) => !isDone(t)));
    setIndex(0);
    setSolved(false);
  };


  const doneCount = tasks.filter(isDone).length;
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'Ежедневные', to: routes.today(date.slice(0, 7)) }, { label: dayTitle(date) }]} />
        <p className={styles.kicker}>
          {date === todayKey() ? 'Задания на сегодня' : `Задания на ${dayTitle(date)}`}
        </p>
        <div className={styles.progress}>
          <ProgressBar value={tasks.length ? doneCount / tasks.length : 0} />
          <span>
            {doneCount}/{tasks.length}
          </span>
        </div>
      </header>

      {!started && item ? (
        <Overview tasks={tasks} isDone={isDone} onStart={() => setStarted(true)} />
      ) : item ? (
        <section className={styles.task}>
          <div className={styles.taskHead}>
            <h2 className={styles.taskTitle}>
              {partOf(item).title} · {placeInPart(tasks, item)}
              <span className={styles.source}>{item.source}</span>
            </h2>
            {!solved && !isCard(item) && (
              <button type="button" className={styles.linkBtn} onClick={reveal}>
                Показать ответ
              </button>
            )}
          </div>
          {isCard(item) ? (
            live ? (
              <CardQuestion
                key={item.key}
                card={live}
                stage={item.intro ? 'intro' : undefined}
                sentences={sentences}
                allCards={cards}
                onMeet={meet}
                onAnswer={answerCard}
                onNext={next}
                bare
              />
            ) : (
              <p className={styles.note}>Это слово убрали из карточек.</p>
            )
          ) : (
            <PracticeTask
              key={item.key}
              sentences={item.sentences}
              task={item.task}
              level={level}
              solved={solved}
              onSolved={solve}
              withTranslation={item.withTranslation}
            />
          )}
          {revealed.has(item.key) && <p className={styles.note}>Ответ показан: день закроется, но не «чисто».</p>}
          <div className={isCard(item) && live ? styles.hidden : styles.nav}>
            {solved ? (
              <Button onClick={next}>
                Дальше <Arrow />
              </Button>
            ) : isCard(item) ? (
              <Button
                onClick={() => {
                  solve();
                  next();
                }}
              >
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
      {!item && !closedBefore && isClosed(dayState(day)) && <FoundShard date={date} />}
    </div>
  );
}

/** «3 из 6» — место задания в его части дня. */
function placeInPart(tasks: readonly DayItem[], item: DayItem) {
  const part = partOf(item);
  const same = tasks.filter((t) => partOf(t) === part);
  return `${same.indexOf(item) + 1} из ${same.length}`;
}

/** Оглавление дня: части по порядку, сколько в каждой и примерно сколько минут осталось. */
function Overview({ tasks, isDone, onStart }: { tasks: readonly DayItem[]; isDone: (t: DayItem) => boolean; onStart: () => void }) {
  const parts = DAY_PARTS.map((part) => {
    const own = tasks.filter((t) => partOf(t) === part);
    // Часть «Слова» из карточек — так и называем, что в ней.
    const note = part.id === 'word' && own.some(isCard) ? 'карточки: новые слова и повторение' : part.note;
    return { part, note, total: own.length, done: own.filter(isDone).length };
  }).filter((p) => p.total > 0);
  const left = tasks.filter((t) => !isDone(t));
  const seconds = (left.length ? left : tasks).reduce((n, t) => n + partOf(t).seconds, 0);
  const minutes = Math.max(1, Math.round(seconds / 60));
  const begun = left.length < tasks.length && left.length > 0;
  return (
    <section className={styles.overview}>
      <h2 className={styles.overviewTitle}>
        {begun ? 'Продолжим' : 'Что сегодня'} <span className={styles.overviewTime}>≈ {minutes} мин</span>
      </h2>
      <ol className={styles.parts}>
        {parts.map(({ part, note, total, done }, i) => (
          <li key={part.id} className={done === total ? `${styles.part} ${styles.partDone}` : styles.part}>
            <span className={styles.partNum}>{done === total ? <Check /> : i + 1}</span>
            <span className={styles.partText}>
              <b>{part.title}</b>
              <span>{note}</span>
            </span>
            <span className={styles.partCount}>{done > 0 && done < total ? `${done}/${total}` : total}</span>
          </li>
        ))}
      </ol>
      <Button onClick={onStart} className={styles.overviewStart}>
        {begun ? 'Продолжить' : left.length === 0 ? 'Повторить' : 'Начать'} <Arrow />
      </Button>
    </section>
  );
}

function Finish({ date, day, tasks, onAgain, fresh }: { date: string; day: DailyDayRecord; tasks: readonly DayItem[]; onAgain: () => void; fresh: boolean }) {
  const state = dayState(day);
  const left = tasks.filter((t) => !day.solved.includes(t.key) && !day.revealed.includes(t.key)).length;
  // Слова из заданий с показанным ответом уже в карточках — добавлены при «Показать ответ».
  const words = useMemo(() => new Set(tasks.filter((t) => day.revealed.includes(t.key)).flatMap((t) => wordsOf(t).map((w) => w.greek))).size, [tasks, day.revealed]);
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
      {words > 0 && (
        <p className={styles.note}>
          <Check /> Слова из ошибок ({words}) добавлены в карточки — <Link to={routes.cards()}>повторять</Link>
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
