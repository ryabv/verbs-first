import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { isDueAny, planToday, statusOf, useCards, type Card, type DeckRef } from '@/entities/card';
import { chapterOpen, chapterRank, chapterRead, doneAt, STORY_CHAPTERS, useStoryProgress, type StoryChapter } from '@/entities/story';
import { vesselOfMonth, VesselPicture } from '@/entities/vessel';
import { PROVERBS } from '@/entities/proverb';
import { Phrase, Word } from '@/features/card-add';
import { dateKey, dayState, isClosed, monthOf, monthSummary, partOf, todayKey, useDailyDays, weekOf, type DailyDayRecord } from '@/features/daily';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { buttonClassName } from '@/shared/ui/button';
import { PlayIcon } from '@/shared/ui/icon';
import { Arrow, Check, Laurel, Meander } from '@/shared/ui/ornament';
import { greetingAt } from '../lib/greeting';
import styles from './MainPage.module.css';

/** Слова с Главной (приветствие, пословица дня) — в свой набор карточек. */
const MAIN_DECK: DeckRef = { id: 'main', title: 'С Главной' };
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/**
 * Главная (docs/product/home.md): зайти — и захотеть учиться. Сверху — место текущей главы во весь экран
 * и приветствие по-гречески. Первым — «Сегодня» (привычка): сосуд месяца, который наполняется черепками,
 * неделя венков, стопка карточек. Дальше — пергамент главы Истории. Пословица дня — под приветствием.
 */
export function MainPage() {
  const progress = useStoryProgress();
  const chapter = currentChapter(progress);
  const days = useDailyDays();
  const [hour] = useState(() => new Date().getHours());
  const greeting = greetingAt(hour);
  // У главы может не быть картинки — тогда место последней пройденной главы с картинкой.
  const image = chapter && (chapter.image ?? STORY_CHAPTERS.findLast((c) => c.id <= chapter.id && c.image)?.image);
  const streak = streakOf(days);
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        {image && <img className={styles.heroImage} src={`${process.env.BASE_URL}story/${image.file}`} alt="" width={1200} height={675} />}
        <div className={styles.heroTop}>
          <div className={styles.heroText}>
            <p className={styles.greeting}>
              {/* Перевод — по нажатию, как у любого слова на сайте. */}
              <span lang="el">
                <Word greek={greeting.greek.replace(/!$/, '')} russian={greeting.russian.replace(/!$/, '')} deck={MAIN_DECK} />!
              </span>
            </p>
            <Proverb />
          </div>
          {streak > 0 && (
            <span className={styles.streak} title="Дней подряд с закрытыми ежедневными">
              <Laurel className={styles.streakLaurel} />
              {streak} {plural(streak, ['день', 'дня', 'дней'])} подряд
            </span>
          )}
        </div>
      </header>

      {/* Сначала «Сегодня» — привычка каждый день; История — дальше (docs/product/home.md). */}
      <div className={styles.content}>
        <h2 className={`${styles.section} ${styles.todayTitle}`}>Сегодня</h2>
        <div className={styles.today}>
          <DailyCard days={days} />
          <CardsCard />
        </div>

        {/* Заголовок — дверь в раздел: с Главной на карту острова одним нажатием. */}
        <div className={`${styles.sectionRow} ${styles.storyTitleRow}`}>
          <h2 className={styles.section}>История</h2>
          <Link to={routes.story()} className={styles.sectionLink}>
            Карта острова <Arrow />
          </Link>
        </div>
        {chapter && <StoryCard chapter={chapter} progress={progress} />}

      </div>
    </div>
  );
}

// ---------- История ----------

type Progress = ReturnType<typeof useStoryProgress>;

/** Глава «сейчас»: первая открытая непрочитанная, иначе первая незакреплённая, иначе последняя открытая. */
function currentChapter(progress: Progress): StoryChapter | undefined {
  const open = STORY_CHAPTERS.filter((c) => chapterOpen(c, STORY_CHAPTERS, progress));
  const levels = (c: StoryChapter) => progress[c.id] ?? {};
  return open.find((c) => !chapterRead(levels(c))) ?? open.find((c) => chapterRank(c, levels(c)) === 0) ?? open.at(-1);
}

function StoryCard({ chapter, progress }: { chapter: StoryChapter; progress: Progress }) {
  const levels = progress[chapter.id] ?? {};
  const done = doneAt(levels, 'light');
  const readSteps = chapter.steps.filter((s) => done.includes(s.id)).length;
  const total = chapter.steps.length;
  const read = chapterRead(levels);
  const rank = chapterRank(chapter, levels);
  const passed = STORY_CHAPTERS.filter((c) => chapterRead(progress[c.id] ?? {})).length;
  const action = !read
    ? { label: readSteps > 0 ? `Продолжить главу ${chapter.id}` : `Читать главу ${chapter.id}`, to: routes.storyChapter(chapter.id) }
    : rank === 0
      ? { label: `Закрепить главу ${chapter.id}`, to: routes.storyPractice(chapter.id) }
      : { label: 'К карте острова', to: routes.story() };
  return (
    <section className={styles.story}>
      <Meander className={styles.meander} />
      <p className={styles.kicker}>
        Эпоха {chapter.epoch} · глава {chapter.id}
      </p>
      <h1 className={styles.storyTitle} lang="el">
        {chapter.title}
      </h1>
      <p className={styles.storyRu}>{chapter.titleRu}</p>
      <p className={styles.storyIntro}>{chapter.intro}</p>
      <div className={styles.storyProgress}>
        <span className={styles.track}>
          <span className={styles.fill} style={{ width: `${total ? (readSteps / total) * 100 : 0}%` }} />
        </span>
        <span>{read ? 'глава прочитана' : `${readSteps} из ${total}`}</span>
      </div>
      <Link to={action.to} className={buttonClassName('primary', styles.storyAction)}>
        {action.label} <Arrow />
      </Link>
      <p className={styles.storyMeta}>
        Пройдено глав: {passed} из {STORY_CHAPTERS.length}
      </p>
      <Meander className={styles.meander} />
    </section>
  );
}

// ---------- Ежедневные ----------

const closedDay = (d: DailyDayRecord | undefined) => isClosed(dayState(d));

/** Серия: сколько дней подряд закрыты ежедневные — до сегодня (или до вчера, если сегодня ещё впереди). */
function streakOf(days: readonly DailyDayRecord[]): number {
  const byId = new Map(days.map((d) => [d.id, d]));
  const day = new Date();
  if (!closedDay(byId.get(todayKey()))) day.setDate(day.getDate() - 1);
  let n = 0;
  for (;;) {
    const key = dateKey(day);
    if (!closedDay(byId.get(key))) return n;
    n++;
    day.setDate(day.getDate() - 1);
  }
}

/** Буквы дней недели в кружках — коротко, чтобы неделя влезла в строку. */
const WEEK_LETTERS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

/**
 * Ежедневные — одной строкой: сосуд месяца (покачивается, залит по найденным черепкам), заголовок и неделя
 * кружками, справа — круглая кнопка ▶ с кольцом прогресса дня (пока день не начат — мягко пульсирует).
 */
function DailyCard({ days }: { days: readonly DailyDayRecord[] }) {
  const today = todayKey();
  const byId = new Map(days.map((d) => [d.id, d]));
  const day = byId.get(today);
  const state = dayState(day);
  const closed = isClosed(state);
  const started = state === 'started' && day !== undefined;
  const month = monthOf(today);
  const summary = monthSummary(month, days);
  const vessel = vesselOfMonth(month);
  const title = closed ? 'Черепок найден!' : started ? `Решено ${Math.round(partDone(day) * day.tasks.length)} из ${day.tasks.length}` : 'Черепок дня ждёт';
  return (
    <section className={`${styles.card} ${closed ? '' : styles.cardMain}`}>
      <div className={styles.tile}>
        <div className={styles.vessel}>
          <VesselPicture vessel={vessel} kind="silhouette" fill={summary.total ? summary.closed / summary.total : 0} className={styles.vesselPic} />
        </div>
        <div className={styles.cardText}>
          <Link to={routes.today()} className={`${styles.cardKicker} ${styles.kickerLink}`}>
            Ежедневные · {summary.closed} из {summary.total} <Arrow />
          </Link>
          <p className={styles.cardTitle}>{title}</p>
          <ol className={styles.week} aria-label="Эта неделя">
            {weekOf(today).map((d, i) => {
              const rec = byId.get(d);
              const st = dayState(rec);
              const done = isClosed(st);
              const cls = [styles.weekDay, done && styles.weekDone, d === today && styles.weekToday, d > today && styles.weekFuture].filter(Boolean).join(' ');
              const style = st === 'started' && rec ? ({ '--part': partDone(rec) } as CSSProperties) : undefined;
              return (
                <li key={d} className={cls} style={style} title={`${WEEKDAYS[i]}${done ? ' — закрыт' : ''}`}>
                  {done ? <Check /> : WEEK_LETTERS[i]}
                </li>
              );
            })}
          </ol>
        </div>
        <Link
          to={closed ? routes.today() : routes.day(today)}
          className={[styles.go, closed && styles.goDone, state === 'empty' && styles.goPulse].filter(Boolean).join(' ')}
          style={{ '--part': started ? partDone(day) : 0 } as CSSProperties}
          aria-label={closed ? 'В музей' : started ? 'Продолжить день' : 'Начать день'}
        >
          <span className={styles.goDisc}>{closed ? <Laurel className={styles.goLaurel} /> : <PlayIcon />}</span>
          <span className={styles.goLabel}>{closed ? 'в музей' : started ? 'дальше' : `${dayMinutes(day)} мин`}</span>
        </Link>
      </div>
    </section>
  );
}

const partDone = (d: DailyDayRecord) => new Set([...d.solved, ...d.revealed]).size / Math.max(1, d.tasks.length);

/** Примерно минут на день — по частям дня; день ещё не собран — по полному рецепту. */
function dayMinutes(day: DailyDayRecord | undefined): number {
  if (!day) return 6;
  const seconds = day.tasks.reduce((n, k) => n + partOf({ group: groupOfKey(k) }).seconds, 0);
  return Math.max(1, Math.round(seconds / 60));
}

/** Группа задания по ключу (`v:` — слова, `…:listen` — на слух и т. п.): для оценки времени. */
function groupOfKey(key: string) {
  if (key.startsWith('v:')) return 'word' as const;
  if (key.startsWith('a:') || key.endsWith(':listen')) return 'listen' as const;
  if (key.endsWith(':tr')) return 'translate' as const;
  if (key.endsWith(':form')) return 'form' as const;
  if (key.startsWith('p:')) return 'practice' as const;
  return 'text' as const;
}

// ---------- Карточки ----------

const learned = (c: Card) => statusOf(c, 'gr-ru') === 'learned' && statusOf(c, 'ru-gr') === 'learned';
// Служебные карточки («ο/η/το») и длинные фразы на маленькой карточке не смотрятся — сверху обычное слово.
const nice = (c: Card) => !c.greek.includes('/') && c.greek.length <= 12;
const words = (n: number) => `${n} ${plural(n, ['слово', 'слова', 'слов'])}`;

/** Карточки — той же строкой: стопка со словом, которое ждёт первым, полоска «выучено», круглая кнопка с числом. */
function CardsCard() {
  const { cards } = useCards();
  const due = cards.filter((c) => isDueAny(c));
  const fresh = planToday(cards, 'gr-ru').fresh;
  const learnedCount = cards.filter(learned).length;
  // На верхней карточке — слово, которое ждёт первым: так стопка «зовёт» конкретным словом.
  const top = due.find(nice) ?? fresh.find(nice) ?? cards.find(nice) ?? due[0] ?? fresh[0];
  const title = cards.length === 0 ? 'Карточек пока нет' : due.length > 0 ? `${words(due.length)} ждут` : fresh.length > 0 ? `${words(fresh.length)} — новые` : 'На сегодня всё';
  const count = due.length || fresh.length;
  return (
    <section className={styles.card}>
      <div className={styles.tile}>
        <div className={styles.deck} aria-hidden="true">
          <span className={styles.deckCard} />
          <span className={styles.deckCard} />
          <span className={`${styles.deckCard} ${styles.deckTop}`} lang="el">
            {top ? top.greek : 'α'}
          </span>
        </div>
        <div className={styles.cardText}>
          <Link to={routes.cards()} className={`${styles.cardKicker} ${styles.kickerLink}`}>
            Карточки <Arrow />
          </Link>
          <p className={styles.cardTitle}>{title}</p>
          {cards.length > 0 ? (
            <p className={styles.learn}>
              <span className={styles.learnTrack}>
                <span className={styles.learnFill} style={{ width: `${(learnedCount / cards.length) * 100}%` }} />
              </span>
              выучено {learnedCount} из {cards.length}
            </p>
          ) : (
            <p className={styles.cardSub}>Дочитайте главу — её слова лягут сюда сами.</p>
          )}
        </div>
        <Link
          to={routes.cards()}
          className={[styles.go, count === 0 && styles.goDone].filter(Boolean).join(' ')}
          aria-label={due.length > 0 ? `Повторить ${due.length}` : fresh.length > 0 ? 'Учить новые' : 'К карточкам'}
        >
          <span className={styles.goDisc}>{count > 0 ? <b className={styles.goCount}>{count}</b> : <Check />}</span>
          <span className={styles.goLabel}>{due.length > 0 ? 'повторить' : fresh.length > 0 ? 'учить' : 'открыть'}</span>
        </Link>
      </div>
    </section>
  );
}

// ---------- Пословица дня (в шапке) ----------

/** Номер дня от начала эпохи — пословицы идут по кругу, по одной в день, без повторов подряд. */
const dayNumber = (key: string) => Math.floor(Date.parse(key) / 86_400_000);

/**
 * Пословица дня — под приветствием, прямо на картинке: греческий (слова нажимаются с переводом и «в карточки»),
 * под ним перевод слово в слово и «послушать»; смысл — всплывает по нажатию «смысл».
 */
function Proverb() {
  const [shown, setShown] = useState(false);
  const proverb = PROVERBS[dayNumber(todayKey()) % PROVERBS.length];
  if (!proverb) return null;
  return (
    <div className={styles.proverb}>
      <p className={styles.proverbGreek} lang="el">
        <Phrase greek={proverb.greek} russian={proverb.russian} deck={MAIN_DECK} wordDeck={() => MAIN_DECK} />
      </p>
      <p className={styles.proverbRu}>
        {proverb.russian}
        <span className={styles.proverbSpeak}>
          <SpeakButton text={proverb.greek} />
        </span>
        <button type="button" className={styles.proverbMore} onClick={() => setShown((v) => !v)} aria-expanded={shown}>
          {shown ? 'скрыть' : 'смысл'}
        </button>
      </p>
      {/* Смысл — всплывает поверх, не сдвигая страницу. */}
      {shown && <p className={styles.proverbMeaning}>{proverb.meaning}</p>}
    </div>
  );
}
