import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { addCards, ensureDeck } from '@/entities/card';
import { getLesson, knownVerbIds, type ReadingText } from '@/entities/lesson';
import { FindViewer, getChapter, markStoryStep, STORY_END, type StoryChapter } from '@/entities/story';
import { getVerbs } from '@/entities/verb';
import { TokenCard } from '@/features/card-add';
import { ReadingView } from '@/features/text-reading';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { Arrow, Check } from '@/shared/ui/ornament';
import { STORY_DECK, storyDeck } from '../lib/deck';
import { chapterWords } from '../lib/words';
import { ChapterTitle } from './ChapterTitle';
import { Manuscript } from './Manuscript';
import { Rich } from './Rich';
import styles from './Story.module.css';

/** Конец главы: находка, вся глава, конспект, слова в карточки, крючок и «Закрепить главу» (по умолчанию; можно пропустить). */
export function ChapterEnd({ chapter }: { chapter: StoryChapter }) {
  useEffect(() => {
    markStoryStep(chapter.id, STORY_END);
  }, [chapter.id]);

  const reading = useMemo<ReadingText>(
    () => ({ id: `story-${chapter.id}`, title: chapter.title, sentences: chapter.sentences, glossary: {}, questions: [] }),
    [chapter],
  );
  const verbs = useMemo(() => {
    const lesson = getLesson(chapter.lesson);
    return getVerbs(lesson ? knownVerbIds(lesson) : []);
  }, [chapter.lesson]);
  const words = useMemo(() => chapterWords(chapter), [chapter]);
  // Дочитал главу — её слова сами попадают в карточки (docs/product/home.md): повторы не задваиваются.
  useEffect(() => {
    ensureDeck(STORY_DECK);
    addCards(STORY_DECK.id, words);
  }, [words]);
  const total = chapter.steps.length;
  const next = getChapter(chapter.id + 1);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs
          items={[
            { label: 'История', to: routes.story() },
            { label: `Глава ${chapter.id}`, to: routes.storyChapter(chapter.id) },
            { label: 'Конец главы' },
          ]}
        />
        <p className={styles.kicker}>Глава {chapter.id} прочитана</p>
      </header>

      {/* Находка главы — первым: момент, когда предмет появляется (docs/product/finds.md). */}
      {chapter.find && (
        <section className={styles.endFind}>
          <FindViewer icon={chapter.find.icon} reveal className={styles.endFindStage} />
          <div className={styles.endFindText}>
            <p className={styles.endFindKicker}>Находка главы</p>
            <h2 className={styles.endFindTitle}>{chapter.find.title}</h2>
            <p className={styles.findDesc}>
              <Rich text={chapter.find.text} wordDeck={storyDeck} />
            </p>
            <p className={styles.findsHint}>Покрутите её — она теперь на полке «Находки» на карте.</p>
          </div>
        </section>
      )}

      <p className={styles.lead}>Вот глава целиком. Непонятное слово — нажмите на него.</p>

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
        <p className={styles.addedWords}>
          <Check /> Слова главы добавлены в карточки — <Link to={routes.cards()}>повторять</Link>
        </p>
        <p className={styles.teaser}>
          <Rich text={chapter.teaser} wordDeck={storyDeck} />
        </p>
        <div className={styles.finishRow}>
          <Link to={routes.storyPractice(chapter.id)} className={buttonClassName('primary')}>
            Закрепить главу <Arrow />
          </Link>
          <Link to={next ? routes.storyChapter(next.id) : routes.story()}>
            Пропустить — {next ? `к главе ${next.id}` : 'к истории'} <Arrow />
          </Link>
        </div>
        <p className={styles.gapHint}>
          Закрепление — {chapter.practice.length} заданий по тексту главы, 5–10 минут. Следующая эпоха откроется, когда все главы этой
          закреплены хотя бы на лёгком.
        </p>
        <Link to={routes.storyStep(chapter.id, total)}>
          <Arrow direction="left" /> К последнему шагу
        </Link>
      </footer>
    </div>
  );
}
