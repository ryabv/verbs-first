import { useState, type ReactNode } from 'react';
import {
  addCards,
  createDeck,
  DEFAULT_DECK,
  ensureDeck,
  findCard,
  removeFromDeck,
  useCards,
  recentDecks,
  type Card,
  type Deck,
  type DeckRef,
} from '@/entities/card';
import { Check } from '@/shared/ui/ornament';
import styles from './Word.module.css';

interface Props {
  greek: string;
  russian: string;
  /** Набор, который предлагаем первым; по умолчанию — «Мои слова». */
  deck?: DeckRef;
  /** Ещё ссылка в нижнюю строку окна (например, «Вся фраза»). */
  extra?: ReactNode;
}

/** Сколько быстрых кнопок наборов показывать (кроме наборов, где слово уже есть). */
const QUICK = 3;

/**
 * Добавление слова в карточки: быстрые кнопки-наборы прямо в окне —
 * набор этого места, недавние наборы и те, где слово уже лежит. Нажатие ставит/снимает слово.
 * «Все наборы…» — полный список с галочками и создание нового.
 */
export function AddToCards({ greek, russian, deck = DEFAULT_DECK, extra }: Props) {
  const { cards, decks } = useCards();
  const [picking, setPicking] = useState(false);
  const card = findCard(cards, greek);

  if (picking) {
    return <DeckPicker greek={greek} russian={russian} suggested={deck} onDone={() => setPicking(false)} />;
  }

  const ready = greek.trim() !== '' && russian.trim() !== '';
  const has = (id: string) => card?.deckIds.includes(id) ?? false;
  const suggested: DeckRef = decks.find((d) => d.id === deck.id) ?? deck;
  const quick: DeckRef[] = [];
  const push = (d: DeckRef) => {
    if (!quick.some((q) => q.id === d.id)) quick.push(d);
  };
  push(suggested);
  decks.filter((d) => has(d.id)).forEach(push);
  for (const d of [...recentDecks(decks, QUICK), DEFAULT_DECK]) {
    if (quick.length >= QUICK) break;
    push(decks.find((x) => x.id === d.id) ?? d);
  }

  return (
    <span className={styles.quick}>
      <span className={styles.chips}>
        {quick.map((d) => {
          const on = has(d.id);
          return (
            <button
              key={d.id}
              type="button"
              className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              aria-pressed={on}
              disabled={!ready && !on}
              title={on ? `Убрать из «${d.title}»` : `Добавить в «${d.title}»`}
              onClick={() => (on ? removeFrom(card!, d.id) : addTo(d, greek, russian))}
            >
              {on ? <Check /> : '+'} {d.title}
            </button>
          );
        })}
      </span>
      <span className={styles.quickLinks}>
        <button type="button" className={styles.linkBtn} onClick={() => setPicking(true)} disabled={!ready && !card}>
          Наборы…
        </button>
        {extra}
      </span>
    </span>
  );
}

/** Убрать из набора; если это последний набор и слово уже учили — спросить. */
function removeFrom(card: Card, deckId: string) {
  const last = card.deckIds.length === 1;
  const studied = card.progress['ru-gr'].seen + card.progress['gr-ru'].seen > 0;
  if (last && studied && !window.confirm('Это последний набор слова — карточка и её прогресс удалятся. Убрать?')) return;
  removeFromDeck(card.id, deckId);
}

function addTo(deck: DeckRef, greek: string, russian: string) {
  ensureDeck(deck);
  addCards(deck.id, [{ greek, russian }]);
}

interface PickerProps {
  greek: string;
  russian: string;
  suggested: DeckRef;
  onDone: () => void;
}

/** Галочки по наборам + «Новый набор». Слово остаётся одной карточкой с общим прогрессом. */
function DeckPicker({ greek, russian, suggested, onDone }: PickerProps) {
  const { cards, decks } = useCards();
  const [title, setTitle] = useState('');
  const card = findCard(cards, greek);
  const checked = (id: string) => card?.deckIds.includes(id) ?? false;

  // Предложенный набор (может ещё не существовать) → свои → наборы уроков.
  const suggestedDeck: DeckRef = decks.find((d) => d.id === suggested.id) ?? suggested;
  const rest = decks.filter((d) => d.id !== suggested.id);
  const ordered: DeckRef[] = [
    suggestedDeck,
    ...rest.filter((d) => d.lessonId === undefined),
    ...rest.filter((d) => d.lessonId !== undefined),
  ];

  const toggle = (d: DeckRef) => {
    if (checked(d.id)) {
      if (card) removeFrom(card, d.id);
    } else {
      addTo(d, greek, russian);
    }
  };

  const create = () => {
    if (!title.trim()) return;
    const created: Deck = createDeck(title);
    addCards(created.id, [{ greek, russian }]);
    setTitle('');
  };

  const lastOne = card?.deckIds.length === 1;

  return (
    <span className={styles.picker}>
      <span className={styles.pickerTitle}>Наборы</span>
      <span className={styles.deckOptions}>
        {ordered.map((d) => (
          <label key={d.id} className={styles.deckOption}>
            <input type="checkbox" checked={checked(d.id)} onChange={() => toggle(d)} />
            <span>{d.title}</span>
          </label>
        ))}
      </span>
      <span className={styles.newDeck}>
        <input
          className={styles.newDeckInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
          }}
          placeholder="Новый набор"
          aria-label="Название нового набора"
          autoComplete="off"
        />
        <button type="button" className={styles.linkBtn} onClick={create} disabled={!title.trim()}>
          Создать
        </button>
      </span>
      {lastOne && <span className={styles.deckHint}>Снимете последнюю галочку — слово уйдёт из карточек.</span>}
      <button type="button" className={styles.doneBtn} onClick={onDone}>
        Готово
      </button>
    </span>
  );
}
