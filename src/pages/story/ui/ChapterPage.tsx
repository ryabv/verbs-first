import { Link, useParams } from 'react-router';
import {
  branchRead,
  chapterOpen,
  chapterRank,
  chapterRead,
  doneAt,
  getChapter,
  STORY_CHAPTERS,
  STORY_LEVEL_LABELS,
  STORY_LEVELS,
  useStoryLevels,
  useStoryProgress,
  type StoryChapter,
} from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { Arrow, Check, Meander } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { lockReason } from '../lib/lock';
import { BranchPage } from './BranchPage';
import { CatIcon } from './CatIcon';
import { ChapterEnd } from './ChapterEnd';
import { PlaceImage } from './PlaceImage';
import { PracticePage } from './PracticePage';
import { StepPage } from './StepPage';
import styles from './Story.module.css';

/** /story/:chapterId — страница главы; /story/:chapterId/:step — шаг (номер с 1), end или practice. */
export function ChapterRoute() {
  const { chapterId = '', step, branch } = useParams();
  const chapter = getChapter(Number(chapterId));
  const progress = useStoryProgress();
  if (!chapter) return <NotFound />;
  // Внутри эпохи — следующая глава после чтения прошлой; новая эпоха — после закрепления всей прошлой.
  if (!chapterOpen(chapter, STORY_CHAPTERS, progress)) return <Locked chapter={chapter} progress={progress} />;
  if (branch !== undefined) {
    const b = chapter.branches?.find((x) => x.id === branch);
    return b ? <BranchPage chapter={chapter} branch={b} /> : <NotFound />;
  }
  if (step === 'end') return <ChapterEnd chapter={chapter} />;
  if (step === 'practice') return <PracticePage chapter={chapter} />;
  if (step !== undefined) {
    const index = Number(step) - 1;
    if (!Number.isInteger(index) || !chapter.steps[index]) return <NotFound />;
    return <StepPage chapter={chapter} index={index} />;
  }
  return <ChapterPage chapter={chapter} />;
}

function Locked({ chapter, progress }: { chapter: StoryChapter; progress: ReturnType<typeof useStoryProgress> }) {
  const { text, to } = lockReason(chapter, progress);
  return (
    <div className={styles.page}>
      <p className={styles.lead}>{text}</p>
      <Link to={routes.storyChapter(to)}>
        <Arrow direction="left" /> К главе {to}
      </Link>
    </div>
  );
}

function NotFound() {
  return (
    <div className={styles.page}>
      <p className={styles.lead}>Такой главы или шага нет.</p>
      <Link to={routes.story()}>
        <Arrow direction="left" /> К истории
      </Link>
    </div>
  );
}

function ChapterPage({ chapter }: { chapter: StoryChapter }) {
  const levels = useStoryLevels(chapter.id);
  const done = doneAt(levels, 'light');
  const readSteps = chapter.steps.filter((s) => done.includes(s.id)).length;
  const total = chapter.steps.length;
  const firstUnread = chapter.steps.findIndex((s) => !done.includes(s.id));
  const read = chapterRead(levels);
  const rank = chapterRank(chapter, levels);
  const continueTo = firstUnread === -1 ? routes.storyStep(chapter.id, 'end') : routes.storyStep(chapter.id, firstUnread + 1);
  const practiced = rank > 0 ? STORY_LEVEL_LABELS[STORY_LEVELS[rank - 1]!].toLowerCase() : undefined;

  return (
    <div className={styles.page}>
      <header className={`${styles.head} ${styles.chapterHead}`}>
        <Breadcrumbs items={[{ label: 'История', to: routes.story() }, { label: `Глава ${chapter.id}` }]} className={styles.heroBack} />
        <div className={styles.hero}>
          {chapter.image && <PlaceImage key={chapter.id} image={chapter.image} className={styles.heroImage} eager />}
          <div className={styles.heroPlate}>
            <Meander className={styles.cartoucheMeander} />
            <p className={styles.kicker}>
              Эпоха {chapter.epoch} · глава {chapter.id}
            </p>
            <h1 className={styles.title} lang="el">
              {chapter.title}
            </h1>
            <p className={styles.subtitle}>{chapter.titleRu}</p>
            <Meander className={styles.cartoucheMeander} />
          </div>
        </div>
        <p className={styles.lead}>{chapter.intro}</p>
        <div className={styles.chapterProgress}>
          <ProgressBar value={readSteps / total} />
          <span>
            Прочитано: {readSteps}/{total}
          </span>
        </div>
        <p className={styles.tileIntro}>
          {practiced ? (
            <>
              Закреплена: {practiced} уровень <Check />
            </>
          ) : read ? (
            'Глава прочитана. Закрепите её — задания по тексту на трёх уровнях.'
          ) : (
            'Сначала читаем — без заданий, только вопросы на понимание. Потом — закрепление.'
          )}
        </p>
        <div className={styles.cardActions}>
          <Link to={continueTo} className={buttonClassName(read ? 'secondary' : 'primary', styles.start)}>
            {read ? 'Перечитать' : readSteps > 0 ? 'Продолжить' : 'Читать'} <Arrow />
          </Link>
          {read && (
            <Link to={routes.storyPractice(chapter.id)} className={buttonClassName(practiced ? 'secondary' : 'primary', styles.start)}>
              Закрепить главу <Arrow />
            </Link>
          )}
        </div>
      </header>

      <ol className={styles.steps}>
        {chapter.steps.map((s, i) => (
          <li key={s.id}>
            <Link to={routes.storyStep(chapter.id, i + 1)} className={styles.stepLink}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={styles.stepName}>{s.title}</span>
              <span className={styles.stepKind}>{s.check ? 'чтение и вопрос' : 'чтение'}</span>
              {done.includes(s.id) && <Check className={styles.stepDone} />}
            </Link>
          </li>
        ))}
        <li>
          <Link to={routes.storyPractice(chapter.id)} className={styles.stepLink}>
            <span className={styles.stepNum}>✦</span>
            <span className={styles.stepName}>Закрепление</span>
            <span className={styles.stepKind}>{chapter.practice.length} заданий</span>
            {rank > 0 && <Check className={styles.stepDone} />}
          </Link>
        </li>
      </ol>

      {chapter.branches && chapter.branches.length > 0 && (
        <section className={styles.catSection}>
          <h2 className={styles.catSectionTitle}>
            <CatIcon /> Рассказы кота Ερμής
          </h2>
          <p className={styles.tileIntro}>По желанию: откуда слова, мифы, обычаи. Читайте в любой момент.</p>
          <ul className={styles.steps}>
            {chapter.branches.map((b) => {
              return (
                <li key={b.id}>
                  <Link to={routes.storyBranch(chapter.id, b.id)} className={styles.stepLink}>
                    <span className={styles.stepNum}>
                      <CatIcon />
                    </span>
                    <span className={styles.stepName}>{b.title}</span>
                    <span className={styles.stepKind}>рассказ</span>
                    {branchRead(b, levels) && <Check className={styles.stepDone} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
