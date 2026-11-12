import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  chapterOpen,
  chapterRank,
  doneAt,
  getChapter,
  PROLOGUE,
  STORY_CHAPTERS,
  STORY_LEVEL_LABELS,
  STORY_LEVELS,
  STORY_PLACES,
  useStoryLevel,
  useStoryProgress,
  type LevelRank,
  type StoryChapter,
  type StoryFind,
} from '@/entities/story';
import { READING_COURSE } from '@/entities/alphabet';
import { progressKey, readProgress } from '@/features/lesson-progress';
import { routes } from '@/shared/config/routes';
import { buttonClassName } from '@/shared/ui/button';
import { Arrow, Check, Meander } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { storyDeck } from '../lib/deck';
import { FindIcon } from './FindIcon';
import { Rich } from './Rich';
import { IslandMap } from './IslandMap';
import { LevelSwitch } from './LevelSwitch';
import { PlaceImage } from './PlaceImage';
import { StoryMap, type PlaceState } from './StoryMap';
import styles from './Story.module.css';

/** /story — карта острова: места глав, тропа, неоткрытые места под «?», находки. */
export function StoryPage() {
  const progress = useStoryProgress();
  const level = useStoryLevel();
  // Шаги, пройденные на выбранном уровне или сложнее.
  const doneOf = (id: number) => doneAt(progress[id] ?? {}, level);
  // Уровень главы: 0 — не пройдена, 1…3 — пройдена на лёгком, среднем, сложном.
  const rankOf = (id: number): LevelRank => {
    const c = getChapter(id);
    return c ? chapterRank(c, progress[id] ?? {}) : 0;
  };
  const finished = (id: number) => rankOf(id) >= 1;

  // Текущая глава — первая написанная и не пройденная; если все пройдены — последняя.
  const current = STORY_CHAPTERS.find((c) => !finished(c.id)) ?? STORY_CHAPTERS.at(-1);
  // Пролог (алфавит) — свой прогресс курса чтения; не обязателен, глава 1 открыта и без него.
  const [prologuePart] = useState(readingPart);
  const stateOf = (chapter: number): PlaceState => {
    if (chapter === PROLOGUE) return prologuePart >= 1 ? 'done' : 'open';
    if (!getChapter(chapter) || !chapterOpen(chapter, rankOf)) return 'fog';
    if (finished(chapter)) return 'done';
    return chapter === current?.id ? 'current' : 'open';
  };

  const [selected, setSelected] = useState(current?.id ?? 1);
  // Что открыто поверх карты: карточка главы, находки или ничего (видна только карта).
  // Карточка открывается только по нажатию на место — главу ученик выбирает сам.
  const [sheet, setSheet] = useState<'chapter' | 'finds' | null>(null);
  // Картуш с описанием: на широком экране развёрнут; на телефоне — развёрнут при первом входе,
  // а после первого сворачивания — табличка «История ▾».
  const [introOpen, setIntroOpen] = useState(() => wide() || !introSeen());
  const collapseIntro = () => {
    setIntroOpen(false);
    rememberIntroSeen();
  };
  const chapter = getChapter(selected);
  const finds = STORY_CHAPTERS.filter((c) => c.find && finished(c.id));
  const findsPlanned = STORY_PLACES.filter((p) => p.chapter !== PROLOGUE).length;

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const partOf = (id: number) => {
    if (id === PROLOGUE) return prologuePart;
    const c = getChapter(id);
    return c ? c.steps.filter((s) => doneOf(id).includes(s.id)).length / c.steps.length : 0;
  };
  const select = (id: number) => {
    setSelected(id);
    setSheet('chapter');
    // На телефоне описание сворачивается, чтобы карточке и месту хватило экрана.
    if (!wide()) collapseIntro();
  };

  const chapterCard = selected === PROLOGUE ? (
    <PrologueCard part={prologuePart} />
  ) : chapter ? (
    chapterOpen(chapter.id, rankOf) ? (
      <ChapterCard chapter={chapter} done={doneOf(chapter.id)} rank={rankOf(chapter.id)} />
    ) : (
      <p className={styles.fogNote}>
        <b>Глава {chapter.id}</b> откроется, когда вы пройдёте главу {chapter.id - 1} — хотя бы на лёгком уровне.
      </p>
    )
  ) : (
    <p className={styles.fogNote}>
      <b>Глава {selected}</b>. Что здесь случится — пока секрет: место откроется, когда появится глава.
    </p>
  );
  const findsList = <Finds finds={finds} planned={findsPlanned} />;

  const findsBtn = (
    <button
      type="button"
      className={styles.findsBtn}
      aria-pressed={sheet === 'finds'}
      onClick={() => setSheet((s) => (s === 'finds' ? null : 'finds'))}
    >
      Находки · {finds.length} из {findsPlanned}
    </button>
  );
  const intro = introOpen ? (
    <header className={styles.cartouche}>
      <button type="button" className={styles.collapse} onClick={collapseIntro} aria-expanded="true" aria-label="Свернуть описание">
        <Chevron up />
      </button>
      <Meander className={styles.cartoucheMeander} />
      <h1 className={styles.cartoucheTitle}>История</h1>
      <p className={styles.cartoucheLead}>
        Учим греческий по одной большой истории: Анна приезжает на остров Анемуса, где тётя спрятала тайну.
        Каждая глава — новое место на карте; неоткрытые места отмечены «?». Ещё не читаете по-гречески — начните
        с пролога на пароме.
      </p>
      {findsBtn}
      <Meander className={styles.cartoucheMeander} />
    </header>
  ) : (
    // Свёрнутый картуш — табличка «История ▾» и находки: карта и карточка главы видны целиком.
    <header className={styles.cartoucheMini}>
      <h1 className={styles.miniTitle}>
        <button type="button" onClick={() => setIntroOpen(true)} aria-expanded="false" title="Показать описание">
          История <Chevron />
        </button>
      </h1>
      {findsBtn}
    </header>
  );

  return (
    <IslandMap
      stateOf={stateOf}
      partOf={partOf}
      levelOf={(id) => (id === PROLOGUE || !rankOf(id) ? undefined : STORY_LEVEL_LABELS[STORY_LEVELS[rankOf(id) - 1]!].toLowerCase())}
      // Выделено только место с открытой карточкой: при входе ничего не выбрано — выбирает сам ученик.
      selected={sheet === 'chapter' ? selected : undefined}
      start={current?.id ?? 1}
      onSelect={select}
      intro={intro}
      panel={
        sheet && (
          <section className={`${styles.placeCard} ${styles.onMap}`} aria-live="polite">
            <button type="button" className={styles.close} onClick={() => setSheet(null)} aria-label="Закрыть">
              {/* Крестик рисуем линиями: у знака «×» в шрифте свои отступы, и он сидит не по центру. */}
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {sheet === 'finds' ? findsList : chapterCard}
          </section>
        )
      }
      fallback={
        <div className={styles.mapPage}>
          <div className={styles.flatIntro}>{intro}</div>
          <StoryMap places={STORY_PLACES} stateOf={stateOf} selected={selected} onSelect={setSelected} />
          <section className={styles.placeCard} aria-live="polite">
            {chapterCard}
          </section>
          <section className={styles.placeCard}>{findsList}</section>
        </div>
      }
    />
  );
}

/** Доля пройденных шагов курса чтения (пролога). */
function readingPart(): number {
  const done = new Set(readProgress(progressKey.reading).completed);
  const steps = READING_COURSE.steps;
  return steps.length ? steps.filter((s) => done.has(s.id)).length / steps.length : 0;
}

/** Карточка пролога: курс чтения. Необязателен — у каждого слова в главах есть перевод и озвучка. */
function PrologueCard({ part }: { part: number }) {
  const finished = part >= 1;
  return (
    <div className={styles.cardBody}>
      <span className={styles.kicker}>Пролог · по желанию</span>
      <Link to={routes.alphabet()} className={styles.cardTitle}>
        Греческий алфавит
      </Link>
      <p className={styles.tileIntro}>
        Пока паром идёт к острову, Анна учится читать по-гречески. Уже читаете — начинайте сразу с главы 1.
      </p>
      <div className={styles.cardActions}>
        <Link to={routes.alphabet()} className={buttonClassName(finished ? 'secondary' : 'primary')}>
          {finished ? 'Повторить' : part > 0 ? 'Продолжить' : 'Начать'} <Arrow />
        </Link>
        <span className={styles.tileProgress}>
          <span className={styles.tileBar}>
            <ProgressBar value={part} thin />
          </span>
          {finished ? (
            <span className={styles.finished}>
              пройден <Check />
            </span>
          ) : (
            <span>{Math.round(part * 100)}%</span>
          )}
        </span>
      </div>
    </div>
  );
}

const INTRO_KEY = 'verbs-first:story-intro-seen';
/** Описание уже видели и свернули. Хранилище бывает недоступно (приватный режим) — тогда как в первый раз. */
function introSeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}
function rememberIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    // Не запомнили — в следующий раз описание просто снова будет развёрнуто.
  }
}

/** Широкий экран: место хватает и описанию, и карточке сбоку от карты. */
function wide() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 761px)').matches;
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d={up ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Finds({ finds, planned }: { finds: readonly StoryChapter[]; planned: number }) {
  return (
    <div className={styles.findsBody}>
      <h2 className={styles.findsTitle}>
        Находки <span className={styles.findsCount}>{finds.length} из {planned}</span>
      </h2>
      <ul className={styles.findList}>
        {finds.map((c) => (
          <FindItem key={c.id} find={c.find!} chapter={c.id} />
        ))}
        {Array.from({ length: Math.min(3, planned - finds.length) }, (_, i) => (
          <li key={`empty-${i}`} className={styles.findEmpty} aria-hidden="true">
            ?
          </li>
        ))}
      </ul>
      {finds.length === 0 && <p className={styles.findsHint}>Дочитайте главу — её находка появится здесь.</p>}
    </div>
  );
}

function ChapterCard({ chapter, done, rank }: { chapter: StoryChapter; done: readonly string[]; rank: LevelRank }) {
  const steps = chapter.steps.filter((s) => done.includes(s.id)).length;
  const total = chapter.steps.length;
  // Пройдена на выбранном уровне (или сложнее).
  const finished = steps === total;
  const firstOpen = chapter.steps.findIndex((s) => !done.includes(s.id));
  const to = steps === 0 ? routes.storyStep(chapter.id, 1) : firstOpen === -1 ? routes.storyStep(chapter.id, 'end') : routes.storyStep(chapter.id, firstOpen + 1);
  return (
    <div className={styles.cardBody}>
      {chapter.image && <PlaceImage key={chapter.id} image={chapter.image} className={styles.placeImage} />}
      <span className={styles.kicker}>
        Глава {chapter.id}
      </span>
      <Link to={routes.storyChapter(chapter.id)} className={styles.cardTitle} lang="el">
        {chapter.title}
      </Link>
      <span className={styles.subtitle}>{chapter.titleRu}</span>
      <p className={styles.tileIntro}>{chapter.intro}</p>
      <LevelSwitch passed={rank} />
      <div className={styles.cardActions}>
        <Link to={to} className={buttonClassName('primary')}>
          {finished ? 'Перечитать' : steps > 0 ? 'Продолжить' : 'Начать'} <Arrow />
        </Link>
        <span className={styles.tileProgress}>
          <span className={styles.tileBar}>
            <ProgressBar value={steps / total} thin />
          </span>
          {finished ? (
            <span className={styles.finished}>
              пройдена <Check />
            </span>
          ) : (
            <span>
              {steps}/{total}
            </span>
          )}
        </span>
        <Link to={routes.storyChapter(chapter.id)} className={styles.allSteps}>
          Все шаги
        </Link>
      </div>
    </div>
  );
}

function FindItem({ find, chapter }: { find: StoryFind; chapter: number }) {
  return (
    <li className={styles.find}>
      <FindIcon icon={find.icon} className={styles.findIcon} />
      <span className={styles.findText}>
        <span>
          <b>{find.title}</b> <span className={styles.findChapter}>· глава {chapter}</span>
        </span>
        <span className={styles.findDesc}>
          <Rich text={find.text} wordDeck={storyDeck} />
        </span>
      </span>
    </li>
  );
}
