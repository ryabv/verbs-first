import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  cardsInDeck,
  cardsInDecks,
  DEFAULT_DECK_ID,
  removeDeck,
  removeFromDeck,
  statusOf,
  useCards,
  type Deck,
} from '@/entities/card';
import { AddWordForm } from '@/features/card-editor';
import { CardTrainer } from '@/features/card-training';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Callout } from '@/shared/ui/callout';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import styles from './CardsPage.module.css';

/** Карточки: независимый сервис слов, связанный с уроками через наборы. */
export function CardsPage() {
  const { decks, cards } = useCards();
  const [params] = useSearchParams();
  const lessonParam = Number(params.get('lesson')) || undefined;

  // null — все наборы.
  const [selected, setSelected] = useState<string[] | null>(() =>
    lessonParam ? decks.filter((d) => d.lessonId === lessonParam).map((d) => d.id) : null,
  );
  const isSelected = (id: string) => selected === null || selected.includes(id);
  const toggle = (id: string) => {
    const current = selected ?? decks.map((d) => d.id);
    setSelected(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  // Слово из нескольких выбранных наборов попадает в тренировку один раз.
  const pool = useMemo(() => cardsInDecks(cards, selected), [cards, selected]);
  const learned = cards.filter((c) => statusOf(c, 'ru-gr') === 'learned' && statusOf(c, 'gr-ru') === 'learned').length;

  const lessonDecks = decks.filter((d) => d.lessonId !== undefined).toSorted((a, b) => a.lessonId! - b.lessonId!);
  const ownDecks = decks.filter((d) => d.lessonId === undefined);
  const countIn = (deckId: string) => cardsInDeck(cards, deckId).length;

  const deckItem = (deck: Deck) => (
    <li key={deck.id}>
      <label className={styles.deck}>
        <input type="checkbox" checked={isSelected(deck.id)} onChange={() => toggle(deck.id)} />
        <span className={styles.deckTitle}>{deck.title}</span>
        <span className={styles.deckCount}>{countIn(deck.id)}</span>
      </label>
    </li>
  );

  const sidebar = (
    <>
      <SidebarSection title="Наборы">
        <div className={styles.selectAll}>
          <button type="button" onClick={() => setSelected(null)}>
            Все
          </button>
          <button type="button" onClick={() => setSelected([])}>
            Ни одного
          </button>
        </div>
      </SidebarSection>
      {lessonDecks.length > 0 && (
        <SidebarSection title="Из уроков">
          <ul className={styles.decks}>{lessonDecks.map(deckItem)}</ul>
        </SidebarSection>
      )}
      <SidebarSection title="Свои наборы">
        <ul className={styles.decks}>{ownDecks.map(deckItem)}</ul>
      </SidebarSection>
    </>
  );

  return (
    <SidebarLayout sidebar={sidebar}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'Уроки', to: routes.home() }, { label: 'Карточки' }]} />
        <h1 className={styles.title}>Карточки</h1>
        <p className={styles.lead}>
          Всего слов: {cards.length}
          {learned > 0 && <> · выучено в обе стороны: {learned}</>}
        </p>
      </header>

      {cards.length === 0 && (
        <Callout title="Пока пусто">
          <p>
            Добавьте слова из урока — на шаге «Слова урока» или в{' '}
            <Link to={`${routes.lesson(1)}?mode=reference&tab=words`}>справочнике урока 1</Link> — или впишите своё
            слово ниже.
          </p>
        </Callout>
      )}

      {cards.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Тренировка</h2>
          <CardTrainer pool={pool} allCards={cards} />
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Добавить слово</h2>
        <AddWordForm />
      </section>

      {pool.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Слова в выбранных наборах</h2>
          {decks
            .filter((d) => isSelected(d.id) && countIn(d.id) > 0)
            .map((deck) => (
              <details key={deck.id} className={styles.deckList}>
                <summary>
                  {deck.title} <span className={styles.deckCount}>{countIn(deck.id)}</span>
                </summary>
                <ul className={styles.words}>
                  {cardsInDeck(cards, deck.id).map((card) => (
                      <li key={card.id} className={styles.word}>
                        <span className={styles.greek} lang="el">
                          {card.greek}
                          <SpeakButton text={card.greek} />
                        </span>
                        <span className={styles.russian}>{card.russian}</span>
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => removeFromDeck(card.id, deck.id)}
                          aria-label={`Убрать «${card.greek}» из набора`}
                          title="Убрать из набора"
                        >
                          ×
                        </button>
                      </li>
                  ))}
                </ul>
                {deck.id !== DEFAULT_DECK_ID && (
                  <button
                    type="button"
                    className={styles.removeDeck}
                    onClick={() => {
                      if (window.confirm(`Удалить набор «${deck.title}»? Слова, которых нет в других наборах, удалятся.`)) removeDeck(deck.id);
                    }}
                  >
                    Удалить набор
                  </button>
                )}
              </details>
            ))}
        </section>
      )}
    </SidebarLayout>
  );
}
