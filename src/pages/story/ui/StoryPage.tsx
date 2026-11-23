import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  branchRead,
  chapterOpen,
  chapterRank,
  chapterRead,
  doneAt,
  getChapter,
  PROLOGUE,
  STORY_CHAPTERS,
  FindShelf,
  STORY_LEVEL_LABELS,
  STORY_LEVELS,
  STORY_PLACES,
  useStoryProgress,
  type LevelRank,
  type StoryBranch,
  type StoryChapter,
} from '@/entities/story';
import { READING_COURSE } from '@/entities/alphabet';
import { progressKey, readProgress } from '@/features/lesson-progress';
import { routes } from '@/shared/config/routes';
import { buttonClassName } from '@/shared/ui/button';
import { Arrow, Check, Meander } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { storyDeck } from '../lib/deck';
import { lockReason } from '../lib/lock';
import { Rich } from './Rich';
import { CatIcon } from './CatIcon';
import { IslandMap, type MapBranch } from './IslandMap';
import { PlaceImage } from './PlaceImage';
import { StoryMap, type PlaceState } from './StoryMap';
import styles from './Story.module.css';

/** /story — карта острова: места глав, тропа, неоткрытые места под «?», находки. */
export function StoryPage() {
  const progress = useStoryProgress();
  // Прочитанные шаги главы.
  const doneOf = (id: number) => doneAt(progress[id] ?? {}, 'light');
  // Уровень закрепления главы: 0 — не закреплена, 1…3 — на лёгком, среднем, сложном.
  const rankOf = (id: number): LevelRank => {
    const c = getChapter(id);
    return c ? chapterRank(c, progress[id] ?? {}) : 0;
  };
  // Глава дочитана — место на карте пройдено, находка — в рюкзаке.
  const finished = (id: number) => chapterRead(progress[id] ?? {});
  const isOpen = (id: number) => {
    const c = getChapter(id);
    return Boolean(c && chapterOpen(c, STORY_CHAPTERS, progress));
  };

  // Текущая глава — первая написанная и не дочитанная; если все дочитаны — последняя.
  const current = STORY_CHAPTERS.find((c) => !finished(c.id)) ?? STORY_CHAPTERS.at(-1);
  // Пролог (алфавит) — свой прогресс курса чтения; не обязателен, глава 1 открыта и без него.
  const [prologuePart] = useState(readingPart);
  const stateOf = (chapter: number): PlaceState => {
    if (chapter === PROLOGUE) return prologuePart >= 1 ? 'done' : 'open';
    if (!isOpen(chapter)) return 'fog';
    if (finished(chapter)) return 'done';
    return chapter === current?.id ? 'current' : 'open';
  };

  const [selected, setSelected] = useState(current?.id ?? 1);
  // Что открыто поверх карты: карточка главы, находки или ничего (видна только карта).
  // Карточка открывается только по нажатию на место — главу ученик выбирает сам.
  const [sheet, setSheet] = useState<'chapter' | 'finds' | 'branch' | null>(null);
  // Выбранный рассказ кота: «глава:id».
  const [branchKey, setBranchKey] = useState<string>();
  // Картуш с описанием: на широком экране развёрнут; на телефоне — развёрнут при первом входе,
  // а после первого сворачивания — табличка «История ▾».
  const [introOpen, setIntroOpen] = useState(() => wide() || !introSeen());
  const collapseIntro = () => {
    setIntroOpen(false);
    rememberIntroSeen();
  };
  const chapter = getChapter(selected);
  // Только локально: ?preview — на полке все находки, даже ненайденные.
  const [params] = useSearchParams();
  const preview = process.env.NODE_ENV !== 'production' && params.has('preview');
  const finds = STORY_CHAPTERS.filter((c) => c.find && (preview || finished(c.id)));
  // «из N» — главы, у которых есть находка (docs/product/finds.md).
  const findsPlanned = STORY_CHAPTERS.filter((c) => c.find).length;

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
  // Рассказы кота — у мест открытых глав, доступны сразу.
  const catBranches = STORY_CHAPTERS.filter((c) => isOpen(c.id)).flatMap((c) =>
    (c.branches ?? []).map((b) => ({ chapter: c, branch: b, levels: progress[c.id] ?? {} })),
  );
  const mapBranches: MapBranch[] = catBranches.map(({ chapter: c, branch: b, levels }) => ({
    key: `${c.id}:${b.id}`,
    chapter: c.id,
    title: b.title,
    x: b.x,
    y: b.y,
    read: branchRead(b, levels),
  }));
  const pickedBranch = catBranches.find(({ chapter: c, branch: b }) => `${c.id}:${b.id}` === branchKey);
  const selectBranch = (key: string) => {
    setBranchKey(key);
    setSheet('branch');
    if (!wide()) collapseIntro();
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
    isOpen(chapter.id) ? (
      <ChapterCard chapter={chapter} rank={rankOf(chapter.id)} />
    ) : (
      <p className={styles.fogNote}>{lockReason(chapter, progress).text}</p>
    )
  ) : (
    <p className={styles.fogNote}>
      <b>Глава {selected}</b>. Что здесь случится — пока секрет: место откроется, когда появится глава.
    </p>
  );
  const findsList = (
    <div className={styles.findsWrap}>
      <FindShelf
        finds={finds.map((c) => ({ chapter: c.id, find: c.find! }))}
        planned={findsPlanned}
        renderText={(text) => <Rich text={text} wordDeck={storyDeck} />}
        listClassName={styles.mapShelf}
      />
    </div>
  );

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
        Учим греческий по одной большой истории: Анна приезжает на Кипр, где тётя спрятала тайну, и идёт по её следу
        через всю историю острова. Каждая глава — новое место на карте; неоткрытые места отмечены «?». Ещё не читаете
        по-гречески — начните с пролога: алфавит в дороге.
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
      branches={mapBranches}
      selectedBranch={sheet === 'branch' ? branchKey : undefined}
      onSelectBranch={selectBranch}
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
            {sheet === 'finds' ? (
              findsList
            ) : sheet === 'branch' && pickedBranch ? (
              <BranchCard chapter={pickedBranch.chapter} branch={pickedBranch.branch} />
            ) : (
              chapterCard
            )}
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
        Пока самолёт летит на Кипр, Анна учится читать по-гречески. Уже читаете — начинайте сразу с главы 1.
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

/** Карточка места на карте — коротко: что за глава и вход в неё. Уровень, шаги и прогресс — на странице главы. */
function ChapterCard({ chapter, rank }: { chapter: StoryChapter; rank: LevelRank }) {
  const passed = rank > 0 ? STORY_LEVEL_LABELS[STORY_LEVELS[rank - 1]!].toLowerCase() : undefined;
  return (
    <div className={styles.cardBody}>
      {chapter.image && <PlaceImage key={chapter.id} image={chapter.image} className={styles.placeImage} />}
      <span className={styles.kicker}>
        Глава {chapter.id}
        {passed && (
          <span className={styles.finished}>
            {' '}
            · закреплена: {passed} <Check />
          </span>
        )}
      </span>
      <span className={styles.cardTitle} lang="el">
        {chapter.title}
      </span>
      <span className={styles.subtitle}>{chapter.titleRu}</span>
      <div className={styles.cardActions}>
        <Link to={routes.storyChapter(chapter.id)} className={buttonClassName('primary')}>
          К главе <Arrow />
        </Link>
      </div>
    </div>
  );
}

/** Карточка рассказа кота на карте: о чём он и вход. */
function BranchCard({ chapter, branch }: { chapter: StoryChapter; branch: StoryBranch }) {
  return (
    <div className={styles.cardBody}>
      <span className={styles.kicker}>
        <CatIcon /> <span lang="el">Ερμής</span> рассказывает · глава {chapter.id}
      </span>
      <Link to={routes.storyBranch(chapter.id, branch.id)} className={styles.cardTitle}>
        {branch.title}
      </Link>
      <p className={styles.tileIntro}>{branch.teaser}</p>
      <div className={styles.cardActions}>
        <Link to={routes.storyBranch(chapter.id, branch.id)} className={buttonClassName('primary')}>
          Послушать кота <Arrow />
        </Link>
      </div>
    </div>
  );
}

