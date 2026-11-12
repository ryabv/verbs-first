import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  cardsInDeck,
  cardsInDecks,
  createDeck,
  isDueAny,
  isLearned,
  learnedShare,
  streakOf,
  useCards,
  type Card,
  type Deck,
} from '@/entities/card';
import { AddWordForm } from '@/features/card-editor';
import { CardTrainer } from '@/features/card-training';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { Scroll } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { DeckView } from './DeckView';
import styles from './CardsPage.module.css';

const words = (n: number) => plural(n, ['слово', 'слова', 'слов']);

/** Карточки: «Сегодня» (что повторить), наборы плитками; ?deck=… — страница набора. */
export function CardsPage() {
  const { decks, cards, days } = useCards();
  const [params, setParams] = useSearchParams();
  const [training, setTraining] = useState(false);
  const [adding, setAdding] = useState(false);

  const deck = decks.find((d) => d.id === params.get('deck'));
  if (deck) return <DeckView key={deck.id} deck={deck} />;

  // ?lesson=N — пришли из урока: тренируем слова этого урока.
  const lessonId = Number(params.get('lesson')) || undefined;
  const lessonDeckIds = lessonId ? decks.filter((d) => d.lessonId === lessonId).map((d) => d.id) : null;
  const pool = lessonDeckIds?.length ? cardsInDecks(cards, lessonDeckIds) : cards;
  const streak = streakOf(days);
  const learned = cards.filter(isLearned).length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'История', to: routes.home() }, { label: 'Карточки' }]} />
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Карточки</h1>
          {!training && (
            <Button variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              {adding ? 'Скрыть' : '+ Добавить слово'}
            </Button>
          )}
        </div>
        {cards.length > 0 && (
          <p className={styles.lead}>
            {cards.length} {words(cards.length)} · выучено в обе стороны: {learned}
            {streak > 0 && (
              <span className={styles.streak}>
                {' '}
                · занимаетесь {streak} {plural(streak, ['день', 'дня', 'дней'])} подряд
              </span>
            )}
          </p>
        )}
      </header>

      {adding && !training && (
        <section className={styles.addPanel}>
          <AddWordForm />
        </section>
      )}

      {cards.length === 0 ? (
        <Callout title="Пока пусто">
          <p>
            Слова появляются здесь, когда вы добавляете их из уроков: нажмите на любое греческое слово — и «в
            карточки». Начать можно со <Link to={routes.alphabet()}>слов урока 0</Link> или с{' '}
            <Link to={`${routes.lesson(1)}?mode=reference&tab=words`}>слов урока 1</Link>. Или впишите своё слово —
            кнопка «Добавить слово» выше.
          </p>
        </Callout>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{lessonDeckIds?.length ? `Сегодня · слова урока ${lessonId}` : 'Сегодня'}</h2>
            {lessonDeckIds?.length ? (
              <button type="button" className={styles.linkBtn} onClick={() => setParams({})}>
                Все карточки
              </button>
            ) : null}
          </div>
          <CardTrainer pool={pool} allCards={cards} onSessionChange={setTraining} />
        </section>
      )}

      {!training && cards.length > 0 && <Decks decks={decks} cards={cards} />}
    </div>
  );
}

/** Наборы плитками: уроки — по урокам, дальше свои. */
function Decks({ decks, cards }: { decks: Deck[]; cards: Card[] }) {
  const [naming, setNaming] = useState(false);
  const [, setParams] = useSearchParams();
  const byLesson = new Map<number, Deck[]>();
  for (const d of decks.filter((x) => x.lessonId !== undefined).toSorted((a, b) => a.lessonId! - b.lessonId!)) {
    byLesson.set(d.lessonId!, [...(byLesson.get(d.lessonId!) ?? []), d]);
  }
  const own = decks.filter((d) => d.lessonId === undefined && (cardsInDeck(cards, d.id).length > 0 || d.id !== 'my-words'));

  const create = (title: string) => {
    const deck = createDeck(title);
    setNaming(false);
    setParams({ deck: deck.id });
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Наборы</h2>
      {[...byLesson].map(([lesson, list]) => (
        <div key={lesson} className={styles.group}>
          <h3 className={styles.groupTitle}>Урок {lesson}</h3>
          <ul className={styles.tiles}>
            {list.map((d) => (
              <DeckTile key={d.id} deck={d} cards={cards} title={d.title.replace(/^Урок \d+ · /, '')} />
            ))}
          </ul>
        </div>
      ))}
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Свои наборы</h3>
        <ul className={styles.tiles}>
          {own.map((d) => (
            <DeckTile key={d.id} deck={d} cards={cards} title={d.title} />
          ))}
          <li>
            {!naming ? (
              <button type="button" className={`${styles.tile} ${styles.tileNew}`} onClick={() => setNaming(true)}>
                + Новый набор
              </button>
            ) : (
              <NewDeckForm onCreate={create} onCancel={() => setNaming(false)} />
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}

function DeckTile({ deck, cards, title }: { deck: Deck; cards: Card[]; title: string }) {
  const list = cardsInDeck(cards, deck.id);
  const due = list.filter((c) => isDueAny(c)).length;
  const fresh = list.filter((c) => c.progress['gr-ru'].seen === 0 && c.progress['ru-gr'].seen === 0).length;
  return (
    <li>
      <Link to={`${routes.cards()}?deck=${encodeURIComponent(deck.id)}`} className={styles.tile}>
        <span className={styles.tileHead}>
          <Scroll className={styles.tileIcon} />
          <span className={styles.tileTitle}>{title}</span>
        </span>
        <span className={styles.tileMeta}>
          {list.length} {words(list.length)}
          {due > 0 && <span className={styles.tileDue}> · повторить {due}</span>}
          {due === 0 && fresh > 0 && <> · новых {fresh}</>}
        </span>
        <span className={styles.tileBar}>
          <ProgressBar value={learnedShare(list)} thin />
        </span>
      </Link>
    </li>
  );
}

/** Название нового набора: поле сразу в фокусе, Esc — отмена. */
function NewDeckForm({ onCreate, onCancel }: { onCreate: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  return (
    <form
      className={`${styles.tile} ${styles.tileForm}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onCreate(title);
      }}
    >
      <input
        ref={inputRef}
        className={styles.tileInput}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Например: Еда"
        aria-label="Название набора"
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      <div className={styles.tileFormActions}>
        <Button type="submit" disabled={!title.trim()}>
          Создать
        </Button>
        <button type="button" className={styles.linkBtn} onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}
