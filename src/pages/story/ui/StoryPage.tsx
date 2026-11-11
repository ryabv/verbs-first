import { Link } from 'react-router';
import { STORY_CHAPTERS, STORY_END, STORY_PLANNED, useStoryDone, type StoryChapter } from '@/entities/story';
import { routes } from '@/shared/config/routes';
import { Check } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './Story.module.css';

/** /story — сериал: главы по урокам. */
export function StoryPage() {
  const soon = STORY_PLANNED - STORY_CHAPTERS.length;
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>История</h1>
        <p className={styles.lead}>
          Одна большая история по-гречески — по главе на урок. Каждую главу проходим шаг за шагом: слева — почему здесь
          так написано, справа — сам текст. Впишете нужную форму — история пойдёт дальше.
        </p>
      </header>

      <ol className={styles.chapters}>
        {STORY_CHAPTERS.map((c) => (
          <ChapterTile key={c.id} chapter={c} />
        ))}
        {soon > 0 && (
          <li className={styles.soon}>
            Следующие главы появятся вместе с уроками: глава 2 — после урока 2, и так до главы {STORY_PLANNED}.
          </li>
        )}
      </ol>
    </div>
  );
}

function ChapterTile({ chapter }: { chapter: StoryChapter }) {
  const done = useStoryDone(chapter.id);
  const steps = chapter.steps.filter((s) => done.includes(s.id)).length;
  const finished = done.includes(STORY_END);
  return (
    <li>
      <Link to={routes.storyChapter(chapter.id)} className={styles.chapterTile}>
        <span className={styles.kicker}>
          Глава {chapter.id} · после урока {chapter.lesson}
        </span>
        <span className={styles.tileTitle} lang="el">
          {chapter.title}
        </span>
        <span className={styles.subtitle}>{chapter.titleRu}</span>
        <span className={styles.tileIntro}>{chapter.intro}</span>
        <span className={styles.tileProgress}>
          <span className={styles.tileBar}>
            <ProgressBar value={steps / chapter.steps.length} thin />
          </span>
          {finished ? (
            <span className={styles.finished}>
              прочитана <Check />
            </span>
          ) : (
            <span>
              {steps}/{chapter.steps.length}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
