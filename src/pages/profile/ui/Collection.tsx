import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { READING_COURSE } from '@/entities/alphabet';
import { getLesson, getLessonCatalog, lessonStages, type LessonStage } from '@/entities/lesson';
import { chapterRead, FindThumb, FindViewer, STORY_CHAPTERS, useStoryProgress, type StoryChapter } from '@/entities/story';
import { vesselOfMonth, VesselPicture } from '@/entities/vessel';
import { GreekInline } from '@/features/card-add';
import { DAILY_START, monthOf, monthSummary, monthTitle, shiftMonth, todayKey, useAssembledMonths, useDailyDays, type DailyDayRecord } from '@/features/daily';
import { readExamResult } from '@/features/exam';
import { doneWithExam, isStageDone, progressKey, readProgress } from '@/features/lesson-progress';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { StageMark } from '@/shared/ui/ornament';
import styles from './Collection.module.css';

/** Слова из текста находки — в тот же набор, что и на карте «Истории». */
const STORY_DECK = { id: 'story', title: 'Из истории' };
const storyDeck = () => STORY_DECK;

/**
 * «Коллекция» (docs/product/collection.md) — музейный зал: три зала (находки, сосуды, медальоны), предметы в нишах
 * на подставках под светом, у каждого — латунная табличка. Пустая ниша — что здесь будет и как это получить.
 */
export function Collection() {
  const story = useStoryProgress();
  const finds = STORY_CHAPTERS.filter((c) => c.find);
  const found = finds.filter((c) => chapterRead(story[c.id] ?? {}));
  const today = todayKey();
  const months = dailyMonths(today);
  const built = useAssembledMonths(months).filter(Boolean).length;
  const medals = medalRows();
  const earned = medals.reduce((n, r) => n + r.earned.filter(Boolean).length, 0);
  const total = found.length + built + earned;
  return (
    <section className={styles.hall} aria-labelledby="collection-title">
      <header className={styles.hallHead}>
        <p className={styles.kicker}>Ваш музей</p>
        <h2 id="collection-title" className={styles.hallTitle}>
          Коллекция
        </h2>
        <p className={styles.hallLead}>
          {total === 0
            ? 'Залы пока пусты — каждая глава, месяц ежедневных и этап урока добавят сюда экспонат.'
            : `${total} ${plural(total, ['экспонат', 'экспоната', 'экспонатов'])}: всё, что вы нашли и заслужили.`}
        </p>
      </header>

      <Room title="Находки" note="Предметы из глав «Истории»" count={`${found.length} из ${finds.length}`}>
        <FindNiches finds={finds} found={new Set(found.map((c) => c.id))} />
      </Room>
      <Room title="Сосуды" note="Сосуд месяца — за все дни ежедневных" count={`${built} из ${months.length}`}>
        <Slider start={months.length - 1}>
          {months.map((m) => (
            <VesselNiche key={m} month={m} today={today} />
          ))}
        </Slider>
      </Room>
      <Room title="Медальоны" note="За этапы уроков, части ДЗ и экзамены" count={`${earned} из ${medals.reduce((n, r) => n + r.stages.length, 0)}`}>
        {/* Уроков будет 16 — футляры лентой; сразу показан текущий: первый, где собраны не все. */}
        <Slider start={Math.max(0, medals.findIndex((r) => r.earned.some((e) => !e)))} wide>
          {medals.map((r) => (
            <Link key={r.key} to={r.to} className={styles.tray}>
              <span className={styles.trayVelvet}>
                {r.stages.map((st, i) => (
                  <StageMark key={st.id} kind={markKind(st)} num={st.num} earned={r.earned[i]!} size="2.1rem" compact className={r.earned[i] ? undefined : styles.markDim} />
                ))}
              </span>
              <span className={styles.plaque}>
                <b>{r.name}</b>
                <span>{r.title}</span>
              </span>
            </Link>
          ))}
        </Slider>
      </Room>
    </section>
  );
}

function Room({ title, note, count, children }: { title: string; note: string; count: string; children: ReactNode }) {
  return (
    <div className={styles.room}>
      <h3 className={styles.roomTitle}>
        <span>{title}</span>
        <span className={styles.roomCount}>{count}</span>
      </h3>
      <p className={styles.roomNote}>{note}</p>
      {children}
    </div>
  );
}

/** Упёрлась ли лента в левый и правый край — стрелку к краю прячем. */
function edgesOf(el: HTMLElement | null) {
  if (!el) return { left: true, right: true };
  return { left: el.scrollLeft < 4, right: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 };
}

/**
 * Лента экспонатов: листается пальцем, колесом или стрелками (на компьютере); ниши защёлкиваются.
 * `start` — к какому экспонату прокрутить сразу (сосуды — к текущему месяцу).
 */
function Slider({ start = 0, wide = false, children }: { start?: number; wide?: boolean; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: true, right: true });
  const update = () => setEdge(edgesOf(track.current));
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const item = el.children[start] as HTMLElement | undefined;
    if (item) el.scrollLeft = item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2;
    const ro = new ResizeObserver(() => setEdge(edgesOf(el)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [start]);
  const go = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className={wide ? `${styles.slider} ${styles.sliderWide}` : styles.slider}>
      <div ref={track} className={styles.track} onScroll={update}>
        {children}
      </div>
      <button type="button" className={`${styles.arrow} ${styles.arrowPrev}`} onClick={() => go(-1)} disabled={edge.left} aria-label="Назад">
        ‹
      </button>
      <button type="button" className={`${styles.arrow} ${styles.arrowNext}`} onClick={() => go(1)} disabled={edge.right} aria-label="Дальше">
        ›
      </button>
    </div>
  );
}

/** Ниша в стене: свет сверху, экспонат на подставке, табличка. */
function Niche({ object, title, sub, empty = false }: { object: ReactNode; title: string; sub: string; empty?: boolean }) {
  return (
    <>
      <span className={empty ? `${styles.niche} ${styles.nicheEmpty}` : styles.niche}>
        <span className={styles.object}>{object}</span>
        <span className={styles.plinth} aria-hidden="true" />
      </span>
      <span className={styles.plaque}>
        <b>{title}</b>
        <span>{sub}</span>
      </span>
    </>
  );
}

function FindNiches({ finds, found }: { finds: readonly StoryChapter[]; found: ReadonlySet<number> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<StoryChapter>();
  const show = (c: StoryChapter) => {
    setOpen(c);
    dialog.current?.showModal();
  };
  return (
    <>
      <Slider>
        {finds.map((c) =>
          found.has(c.id) ? (
            <button key={c.id} type="button" className={styles.exhibit} onClick={() => show(c)}>
              <Niche object={<FindThumb icon={c.find!.icon} className={styles.thumb} />} title={c.find!.title} sub={`Глава ${c.id}`} />
            </button>
          ) : (
            <Link key={c.id} to={routes.storyChapter(c.id)} className={styles.exhibit}>
              <Niche object={<span className={styles.ghost}>?</span>} title={`Глава ${c.id}`} sub="Дочитайте главу" empty />
            </Link>
          ),
        )}
      </Slider>
      {/* Экспонат крупно: витрина поверх зала — покрутить предмет, прочитать табличку; закрыть — ✕ или Esc. */}
      <dialog ref={dialog} className={styles.dialog} onClose={() => setOpen(undefined)}>
        {open?.find && (
          <div className={styles.dialogBody}>
            <button type="button" className={styles.close} onClick={() => dialog.current?.close()} aria-label="Закрыть">
              ✕
            </button>
            <FindViewer icon={open.find.icon} reveal className={styles.viewer} />
            <div className={styles.dialogPlaque}>
              <p className={styles.dialogKicker}>Глава {open.id} · {open.titleRu}</p>
              <h4 className={styles.dialogTitle}>{open.find.title}</h4>
              <p className={styles.dialogText}>
                <GreekInline text={open.find.text} wordDeck={storyDeck} />
              </p>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

/** Месяцы ежедневных — с первого по текущий. */
function dailyMonths(today: string): string[] {
  const months: string[] = [];
  for (let m = monthOf(DAILY_START); m <= monthOf(today); m = shiftMonth(m, 1)) months.push(m);
  return months;
}

function VesselNiche({ month, today }: { month: string; today: string }) {
  const all: readonly DailyDayRecord[] = useDailyDays();
  const [built = false] = useAssembledMonths([month]);
  const vessel = vesselOfMonth(month);
  const { found, total, complete } = monthSummary(month, all, today);
  const done = built && complete;
  return (
    <Link to={routes.today(month)} className={styles.exhibit}>
      <Niche
        object={<VesselPicture vessel={vessel} kind={done ? 'photo' : 'silhouette'} fill={done ? 1 : found.length / Math.max(1, total)} className={styles.vesselPic} />}
        title={done ? vessel.title : monthTitle(month)}
        sub={done ? monthTitle(month) : `черепков: ${found.length} из ${total}`}
        empty={!done}
      />
    </Link>
  );
}

const markKind = (st: LessonStage) => (st.section === 'homework' ? 'homework' : st.section === 'exam' ? 'exam' : 'lesson');

interface MedalRow {
  key: string;
  to: string;
  name: string;
  title: string;
  stages: LessonStage[];
  earned: boolean[];
}

function medalRows(): MedalRow[] {
  const readingStages = lessonStages(READING_COURSE);
  const readingDone = new Set(readProgress(progressKey.reading).completed);
  const readingIsDone = doneWithExam(readingStages, (id) => readingDone.has(id), Boolean(readExamResult('alphabet')?.passed));
  const rows: MedalRow[] = [
    { key: 'reading', to: routes.alphabet(), name: 'Урок 0', title: 'Алфавит и чтение', stages: readingStages, earned: readingStages.map((st) => isStageDone(st, readingIsDone)) },
  ];
  for (const item of getLessonCatalog()) {
    const lesson = item.available ? getLesson(item.id) : undefined;
    if (!lesson) continue;
    const stages = lessonStages(lesson);
    const completed = new Set(readProgress(progressKey.lesson(lesson.id)).completed);
    const isDone = doneWithExam(stages, (id) => completed.has(id), Boolean(readExamResult(lesson.id)?.passed));
    rows.push({ key: `lesson-${lesson.id}`, to: routes.lesson(lesson.id), name: `Урок ${lesson.id}`, title: item.title, stages, earned: stages.map((st) => isStageDone(st, isDone)) });
  }
  return rows;
}
