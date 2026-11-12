import { Link, useParams } from 'react-router';
import {
  chapterOpen,
  chapterRank,
  doneAt,
  getChapter,
  STORY_END,
  useStoryLevel,
  useStoryLevels,
  useStoryProgress,
  type StoryChapter,
} from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { Arrow, Check, Meander } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { ChapterEnd } from './ChapterEnd';
import { LevelSwitch } from './LevelSwitch';
import { PlaceImage } from './PlaceImage';
import { StepPage } from './StepPage';
import styles from './Story.module.css';

/** /story/:chapterId — страница главы; /story/:chapterId/:step — шаг (номер с 1) или end. */
export function ChapterRoute() {
  const { chapterId = '', step } = useParams();
  const chapter = getChapter(Number(chapterId));
  const progress = useStoryProgress();
  if (!chapter) return <NotFound />;
  // Следующая глава — когда предыдущая пройдена хотя бы на лёгком.
  const rankOf = (id: number) => {
    const c = getChapter(id);
    return c ? chapterRank(c, progress[id] ?? {}) : 0;
  };
  if (!chapterOpen(chapter.id, rankOf)) return <Locked chapter={chapter} />;
  if (step === 'end') return <ChapterEnd chapter={chapter} />;
  if (step !== undefined) {
    const index = Number(step) - 1;
    if (!Number.isInteger(index) || !chapter.steps[index]) return <NotFound />;
    return <StepPage chapter={chapter} index={index} />;
  }
  return <ChapterPage chapter={chapter} />;
}

function Locked({ chapter }: { chapter: StoryChapter }) {
  return (
    <div className={styles.page}>
      <p className={styles.lead}>
        Глава {chapter.id} откроется, когда вы пройдёте главу {chapter.id - 1} — хотя бы на лёгком уровне.
      </p>
      <Link to={routes.storyChapter(chapter.id - 1)}>
        <Arrow direction="left" /> К главе {chapter.id - 1}
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
  const level = useStoryLevel();
  const levels = useStoryLevels(chapter.id);
  const done = doneAt(levels, level);
  const doneSteps = chapter.steps.filter((s) => done.includes(s.id)).length;
  const total = chapter.steps.length;
  const firstOpen = chapter.steps.findIndex((s) => !done.includes(s.id));
  const started = doneSteps > 0;
  const continueTo = firstOpen === -1 ? routes.storyStep(chapter.id, 'end') : routes.storyStep(chapter.id, firstOpen + 1);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'История', to: routes.story() }, { label: `Глава ${chapter.id}` }]} />
        <div className={styles.hero}>
          {chapter.image && <PlaceImage key={chapter.id} image={chapter.image} className={styles.heroImage} eager />}
          <div className={styles.heroPlate}>
            <Meander className={styles.cartoucheMeander} />
            <p className={styles.kicker}>
              Глава {chapter.id}
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
          <ProgressBar value={doneSteps / total} />
          <span>
            Шаги: {doneSteps}/{total}
          </span>
        </div>
        <LevelSwitch passed={chapterRank(chapter, levels)} className={styles.chapterLevels} />
        <Link to={continueTo} className={buttonClassName('primary', styles.start)}>
          {started ? 'Продолжить' : 'Начать'} <Arrow />
        </Link>
      </header>

      <ol className={styles.steps}>
        {chapter.steps.map((s, i) => (
          <li key={s.id}>
            <Link to={routes.storyStep(chapter.id, i + 1)} className={styles.stepLink}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={styles.stepName}>{s.title}</span>
              <span className={styles.stepKind}>{s.task ? 'задание' : 'чтение'}</span>
              {done.includes(s.id) && <Check className={styles.stepDone} />}
            </Link>
          </li>
        ))}
        <li>
          <Link to={routes.storyStep(chapter.id, 'end')} className={styles.stepLink}>
            <span className={styles.stepNum}>✦</span>
            <span className={styles.stepName}>Вся глава и конспект</span>
            <span className={styles.stepKind}>итог</span>
            {done.includes(STORY_END) && <Check className={styles.stepDone} />}
          </Link>
        </li>
      </ol>
    </div>
  );
}
