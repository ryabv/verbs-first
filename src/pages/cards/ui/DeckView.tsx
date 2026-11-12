import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  cardsInDeck,
  DEFAULT_DECK_ID,
  isDueAny,
  isLearned,
  removeDeck,
  removeFromDeck,
  renameDeck,
  updateCard,
  useCards,
  type Card,
  type Deck,
} from '@/entities/card';
import { AddWordForm } from '@/features/card-editor';
import { CardTrainer, whenText } from '@/features/card-training';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { plural } from '@/shared/lib/plural';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import styles from './CardsPage.module.css';

const words = (n: number) => plural(n, ['слово', 'слова', 'слов']);

/** Как идёт слово: новое, учится, выучено (в обе стороны). */
function statusText(c: Card): { label: string; cls: string } {
  if (isLearned(c)) return { label: 'выучено', cls: styles.stLearned! };
  if (c.progress['gr-ru'].seen + c.progress['ru-gr'].seen > 0) return { label: 'учится', cls: styles.stLearning! };
  return { label: 'новое', cls: styles.stNew! };
}

/** Когда слово вернётся: ближайший срок из двух направлений. */
function dueText(c: Card): string | null {
  const dues = (['gr-ru', 'ru-gr'] as const).filter((d) => c.progress[d].seen > 0).map((d) => c.progress[d].due ?? 0);
  if (!dues.length) return null;
  if (isDueAny(c)) return 'повторить сегодня';
  return `повторить ${whenText(Math.min(...dues))}`;
}

/** Набор: тренировать только его, слова со статусом, правка и удаление. */
export function DeckView({ deck }: { deck: Deck }) {
  const { cards } = useCards();
  const navigate = useNavigate();
  const [training, setTraining] = useState(false);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(deck.title);
  const list = cardsInDeck(cards, deck.id);
  const learned = list.filter(isLearned).length;
  const due = list.filter((c) => isDueAny(c)).length;
  const own = deck.lessonId === undefined;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs
          items={[
            { label: 'История', to: routes.home() },
            { label: 'Карточки', to: routes.cards() },
            { label: deck.title },
          ]}
        />
        {renaming ? (
          <form
            className={styles.renameForm}
            onSubmit={(e) => {
              e.preventDefault();
              renameDeck(deck.id, title);
              setRenaming(false);
            }}
          >
            <input className={styles.tileInput} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Название набора" />
            <Button type="submit" disabled={!title.trim()}>
              Сохранить
            </Button>
            <button type="button" className={styles.linkBtn} onClick={() => setRenaming(false)}>
              Отмена
            </button>
          </form>
        ) : (
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{deck.title}</h1>
            {!training && (
              <Button variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
                {adding ? 'Скрыть' : '+ Добавить слово'}
              </Button>
            )}
          </div>
        )}
        <p className={styles.lead}>
          {list.length} {words(list.length)} · выучено: {learned}
          {due > 0 && <> · повторить сегодня: {due}</>}
          {own && !renaming && (
            <>
              {' · '}
              <button type="button" className={styles.linkBtn} onClick={() => setRenaming(true)}>
                переименовать
              </button>
            </>
          )}
        </p>
      </header>

      {adding && !training && (
        <section className={styles.addPanel}>
          <AddWordForm defaultDeckId={deck.id} />
        </section>
      )}

      {list.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Тренировать этот набор</h2>
          <CardTrainer pool={list} allCards={cards} onSessionChange={setTraining} />
        </section>
      )}

      {!training && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Слова</h2>
          {list.length === 0 ? (
            <p className={styles.empty}>В наборе пока нет слов — добавьте первое кнопкой «Добавить слово».</p>
          ) : (
            <ul className={styles.words}>
              {list.map((c) => (
                <WordRow key={c.id} card={c} deckId={deck.id} />
              ))}
            </ul>
          )}
          {deck.id !== DEFAULT_DECK_ID && (
            <button
              type="button"
              className={styles.removeDeck}
              onClick={() => {
                if (window.confirm(`Удалить набор «${deck.title}»? Слова, которых нет в других наборах, удалятся.`)) {
                  removeDeck(deck.id);
                  navigate(routes.cards());
                }
              }}
            >
              Удалить набор
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function WordRow({ card, deckId }: { card: Card; deckId: string }) {
  const [editing, setEditing] = useState(false);
  const [greek, setGreek] = useState(card.greek);
  const [russian, setRussian] = useState(card.russian);
  const st = statusText(card);
  const when = dueText(card);

  if (editing) {
    return (
      <li className={styles.wordEdit}>
        <form
          className={styles.editForm}
          onSubmit={(e) => {
            e.preventDefault();
            updateCard(card.id, { greek, russian });
            setEditing(false);
          }}
        >
          <input className={styles.tileInput} value={greek} onChange={(e) => setGreek(e.target.value)} lang="el" aria-label="По-гречески" />
          <input className={styles.tileInput} value={russian} onChange={(e) => setRussian(e.target.value)} aria-label="Перевод" />
          <Button type="submit" disabled={!greek.trim() || !russian.trim()}>
            Сохранить
          </Button>
          <button type="button" className={styles.linkBtn} onClick={() => setEditing(false)}>
            Отмена
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.word}>
      <span className={styles.greek} lang="el">
        {card.greek}
        <SpeakButton text={card.greek} />
      </span>
      <span className={styles.russian}>{card.russian}</span>
      <span className={styles.status}>
        <span className={`${styles.st} ${st.cls}`}>{st.label}</span>
        {when && <span className={styles.when}>{when}</span>}
      </span>
      <span className={styles.rowActions}>
        <button type="button" className={styles.iconBtn} onClick={() => setEditing(true)} aria-label={`Исправить «${card.greek}»`} title="Исправить">
          ✎
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconDanger}`}
          onClick={() => removeFromDeck(card.id, deckId)}
          aria-label={`Убрать «${card.greek}» из набора`}
          title="Убрать из набора"
        >
          ×
        </button>
      </span>
    </li>
  );
}
