import { Link, useParams } from 'react-router';
import { getChapter, STORY_END, useStoryDone, type StoryChapter } from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { Arrow, Check, Meander } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { ChapterEnd } from './ChapterEnd';
import { PlaceImage } from './PlaceImage';
import { StepPage } from './StepPage';
import styles from './Story.module.css';

/** /story/:chapterId — страница главы; /story/:chapterId/:step — шаг (номер с 1) или end. */
export function ChapterRoute() {
  const { chapterId = '', step } = useParams();
  const chapter = getChapter(Number(chapterId));
  if (!chapter) return <NotFound />;
  if (step === 'end') return <ChapterEnd chapter={chapter} />;
  if (step !== undefined) {
    const index = Number(step) - 1;
    if (!Number.isInteger(index) || !chapter.steps[index]) return <NotFound />;
    return <StepPage chapter={chapter} index={index} />;
  }
  return <ChapterPage chapter={chapter} />;
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
  const done = useStoryDone(chapter.id);
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
              Глава {chapter.id} · после урока {chapter.lesson}
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

      <p className={styles.practice}>
        Глагольные таблицы и тренажёры — в{' '}
        <Link to={routes.lesson(chapter.lesson)}>уроке {chapter.lesson}</Link>.
      </p>
    </div>
  );
}
