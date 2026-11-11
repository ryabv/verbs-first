import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { getLesson, knownVerbIds, type ReadingText } from '@/entities/lesson';
import { markStoryStep, STORY_END, type StoryChapter } from '@/entities/story';
import { getVerbs } from '@/entities/verb';
import { AddWords, TokenCard } from '@/features/card-add';
import { ReadingView } from '@/features/text-reading';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Arrow } from '@/shared/ui/ornament';
import { storyDeck } from '../lib/deck';
import { chapterWords } from '../lib/words';
import { ChapterTitle } from './ChapterTitle';
import { Manuscript } from './Manuscript';
import { Rich } from './Rich';
import styles from './Story.module.css';

/** Конец главы: вся глава без пропусков, конспект, слова в карточки, крючок. */
export function ChapterEnd({ chapter }: { chapter: StoryChapter }) {
  useEffect(() => markStoryStep(chapter.id, STORY_END), [chapter.id]);

  const reading = useMemo<ReadingText>(
    () => ({ id: `story-${chapter.id}`, title: chapter.title, sentences: chapter.sentences, glossary: {}, questions: [] }),
    [chapter],
  );
  const verbs = useMemo(() => {
    const lesson = getLesson(chapter.lesson);
    return getVerbs(lesson ? knownVerbIds(lesson) : []);
  }, [chapter.lesson]);
  const words = useMemo(() => chapterWords(chapter), [chapter]);
  const total = chapter.steps.length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs
          items={[
            { label: 'История', to: routes.story() },
            { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
            { label: 'Вся глава' },
          ]}
        />
        <p className={styles.kicker}>Вся глава — без подсказок</p>
        <p className={styles.lead}>Прочитайте главу целиком. Непонятное слово — нажмите на него.</p>
      </header>

      <Manuscript chapter={chapter} className={styles.endText} label="Вся глава">
        <ReadingView
          reading={reading}
          verbs={verbs}
          textClassName={styles.bookText}
          heading={<ChapterTitle chapter={chapter} className={styles.endTitle} />}
          renderAdd={(token, glossShown) => <TokenCard token={token} deckFor={storyDeck} translationShown={glossShown} />}
        />
      </Manuscript>

      <section className={styles.summary}>
        <h2>Конспект</h2>
        <ul>
          {chapter.summary.map((line, i) => (
            <li key={i}>
              <Rich text={line} wordDeck={storyDeck} />
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.finish}>
        <AddWords words={words} deckFor={storyDeck} label="Слова главы — в карточки" doneLabel="Слова главы уже в карточках" />
        <p className={styles.teaser}>
          <Rich text={chapter.teaser} wordDeck={storyDeck} />
        </p>
        <div className={styles.finishRow}>
          <Link to={routes.storyStep(chapter.id, total)}>
            <Arrow direction="left" /> К последнему шагу
          </Link>
          <Link to={routes.story()}>
            К истории <Arrow />
          </Link>
        </div>
      </footer>
    </div>
  );
}
