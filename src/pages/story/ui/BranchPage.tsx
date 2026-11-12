import { useEffect } from 'react';
import { Link } from 'react-router';
import { branchKey, markStoryStep, type StoryBranch, type StoryChapter } from '@/entities/story';
import { Phrase } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { Arrow } from '@/shared/ui/ornament';
import { storyDeck, STORY_DECK } from '../lib/deck';
import { CatIcon } from './CatIcon';
import { Rich } from './Rich';
import styles from './Story.module.css';

const READ_AFTER_MS = 10_000;

/** /story/:chapterId/cat/:branch — рассказ кота Ερμής. Необязателен: на уровень главы не влияет. */
export function BranchPage({ chapter, branch }: { chapter: StoryChapter; branch: StoryBranch }) {
  // Прочитан — если провели на странице 10 секунд: случайный заход не считается.
  useEffect(() => {
    const timer = window.setTimeout(() => markStoryStep(chapter.id, branchKey(branch.id)), READ_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [chapter.id, branch.id]);

  const crumbs = (
    <Breadcrumbs
      items={[
        { label: 'История', to: routes.story() },
        { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
        { label: 'Рассказ кота' },
      ]}
    />
  );

  const others = (chapter.branches ?? []).filter((b) => b.id !== branch.id);
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        {crumbs}
        <div className={styles.catHead}>
          <span className={styles.catBadge}>
            <CatIcon size="2rem" />
          </span>
          <div>
            <p className={styles.kicker}>
              <span lang="el">Ερμής</span> рассказывает · по желанию
            </p>
            <h1 className={styles.catTitle}>
              <Rich text={branch.title} wordDeck={storyDeck} />
            </h1>
          </div>
        </div>
      </header>

      <div className={styles.catTale}>
        {branch.body.map((p, i) => (
          <p key={i}>
            <Rich text={p} wordDeck={storyDeck} />
          </p>
        ))}
      </div>

      {branch.examples && (
        <section className={styles.catExamples}>
          <h2>Послушайте</h2>
          {branch.examples.map((e) => (
            <p key={e.greek} className={styles.sentence}>
              <Phrase greek={e.greek} russian={e.russian} deck={STORY_DECK} wordDeck={storyDeck} after={<SpeakButton text={e.greek} />} />
              <span className={styles.translation}>{e.russian}</span>
            </p>
          ))}
        </section>
      )}

      <div className={styles.cardActions}>
        <Link to={routes.storyChapter(chapter.id)} className={buttonClassName('primary')}>
          <Arrow direction="left" /> К главе {chapter.id}
        </Link>
        {others.map((b) => (
          <Link key={b.id} to={routes.storyBranch(chapter.id, b.id)} className={styles.catLink}>
            <CatIcon /> {b.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
