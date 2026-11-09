import { Link } from 'react-router';
import { addCards, ensureDeck, inDeck, useCards } from '@/entities/card';
import type { Lesson } from '@/entities/lesson';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Button, buttonClassName } from '@/shared/ui/button';
import { lessonWordGroups, type WordGroup } from '../lib/lessonWordGroups';
import styles from './LessonWords.module.css';

/** Слова урока по группам с кнопками «добавить в карточки». */
export function LessonWords({ lesson }: { lesson: Lesson }) {
  const { cards } = useCards();
  const groups = lessonWordGroups(lesson);
  const total = groups.reduce((n, g) => n + g.words.length, 0);
  const added = groups.reduce((n, g) => n + g.words.filter((w) => inDeck(cards, w.greek, g.deckId)).length, 0);

  const add = (group: WordGroup, words: WordGroup['words']) => {
    ensureDeck({ id: group.deckId, title: group.deckTitle, lessonId: lesson.id });
    addCards(group.deckId, words);
  };

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <span>
          В карточках: <b>{added}</b> из {total}
        </span>
        {added < total && (
          <Button variant="secondary" onClick={() => groups.forEach((g) => add(g, g.words))}>
            Добавить все слова урока
          </Button>
        )}
        {added > 0 && (
          <Link to={routes.cards({ lesson: lesson.id })} className={buttonClassName('primary')}>
            Учить слова урока
          </Link>
        )}
      </div>

      {groups.map((group) => {
        const missing = group.words.filter((w) => !inDeck(cards, w.greek, group.deckId));
        return (
          <section key={group.deckId} className={styles.group}>
            <header className={styles.groupHead}>
              <h3 className={styles.groupTitle}>
                {group.title} <span className={styles.count}>{group.words.length}</span>
              </h3>
              {missing.length > 0 ? (
                <button type="button" className={styles.addAll} onClick={() => add(group, missing)}>
                  + Добавить всё
                </button>
              ) : (
                <span className={styles.done}>✓ в карточках</span>
              )}
            </header>
            <ul className={styles.list}>
              {group.words.map((word) => {
                const inCards = inDeck(cards, word.greek, group.deckId);
                return (
                  <li key={word.greek} className={styles.word}>
                    <span className={styles.greek} lang="el">
                      {word.greek}
                      <SpeakButton text={word.greek} />
                    </span>
                    <span className={styles.russian}>{word.russian}</span>
                    {inCards ? (
                      <span className={styles.added} title={`Уже в наборе «${group.deckTitle}»`}>
                        ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.add}
                        onClick={() => add(group, [word])}
                        aria-label={`Добавить «${word.greek}» в карточки`}
                        title="Добавить в карточки"
                      >
                        +
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
