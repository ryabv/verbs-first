import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { DeckRef } from '@/entities/card';
import type { TextToken } from '@/entities/verb';
import { SpeakButton } from '@/features/pronounce';
import type { WordDeckFn } from '../lib/lessonWordGroups';
import { analyzePhrase, glossHint, lookupToken } from '../lib/lexicon';
import { WordCard } from './WordCard';
import styles from './Word.module.css';

interface PhraseRef {
  greek: string;
  russian: string;
  deck?: DeckRef;
}

interface Props {
  /** Что в карточку: словарная форма. Пусто — словарной формы нет, ученик впишет сам. */
  greek: string;
  russian: string;
  deck?: DeckRef;
  /** Как слово написано на странице (форма во фразе), если отличается от словарной. */
  display?: string;
  /** Значение формы из словарика текста — подсказка для своего перевода. */
  hint?: string;
  /** Фраза, из которой слово: в окне можно добавить и её целиком. */
  phrase?: PhraseRef;
  /** Тише подчёркивание — для слов внутри фразы. */
  quiet?: boolean;
  children?: ReactNode;
}

const EDGE = 8;

/** Не даём окну вылезти за правый край экрана (на телефоне). Вызывается при появлении окна. */
function keepInViewport(pop: HTMLSpanElement | null) {
  if (!pop) return;
  pop.style.transform = '';
  const overflow = pop.getBoundingClientRect().right - (document.documentElement.clientWidth - EDGE);
  if (overflow > 0) pop.style.transform = `translateX(-${overflow}px)`;
}

/**
 * Греческое слово, которое можно добавить в карточки.
 * Выглядит как текст; по нажатию — маленькое окно: перевод, озвучка, наборы.
 */
export function Word({ greek, russian, deck, display, hint, phrase, quiet, children }: Props) {
  const [open, setOpen] = useState(false);
  const [wholePhrase, setWholePhrase] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popId = useId();
  const shown = display ?? greek;

  // Закрыть по клику мимо и по Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => !v);
    setWholePhrase(false);
  };

  const wordClass = [styles.word, quiet && styles.wordQuiet, open && styles.wordOpen].filter(Boolean).join(' ');

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <button type="button" className={wordClass} onClick={toggle} aria-expanded={open} aria-controls={open ? popId : undefined} lang="el">
        {children ?? shown}
      </button>
      {open && (
        <span className={styles.popover} ref={keepInViewport} id={popId} key={wholePhrase ? 'phrase' : 'word'}>
          {wholePhrase && phrase ? (
            <>
              <span className={styles.popHead}>
                <span lang="el" className={styles.popGreek}>
                  {phrase.greek}
                </span>
                <SpeakButton text={phrase.greek} />
              </span>
              <WordCard greek={phrase.greek} russian={phrase.russian} deck={phrase.deck ?? deck} />
              <button type="button" className={styles.linkBtn} onClick={() => setWholePhrase(false)}>
                ← К слову «{shown}»
              </button>
            </>
          ) : (
            <>
              <span className={styles.popHead}>
                <span lang="el" className={styles.popGreek}>
                  {shown}
                </span>
                {/* Одну букву синтезатор читает как её название — не озвучиваем. */}
                {[...shown].length > 1 && <SpeakButton text={shown} />}
              </span>
              <WordCard greek={greek} russian={russian} deck={deck} display={shown} hint={hint} />
              {phrase && (
                <button type="button" className={styles.linkBtn} onClick={() => setWholePhrase(true)}>
                  Вся фраза в карточки →
                </button>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}

interface PhraseProps {
  greek: string;
  russian: string;
  /** Куда класть фразу целиком. */
  deck?: DeckRef;
  /** Куда класть отдельные слова (по умолчанию — туда же). */
  wordDeck?: WordDeckFn;
}

/** Слово из фразы: в карточку идёт словарная форма (глагол — начальная, сущ. — с артиклем). */
function PhraseWord({ token, phrase, wordDeck }: { token: TextToken; phrase: PhraseRef; wordDeck: PhraseProps['wordDeck'] }) {
  const entry = lookupToken(token);
  return (
    <Word
      greek={entry?.greek ?? ''}
      russian={entry?.russian ?? ''}
      deck={(entry && wordDeck?.(entry)) ?? phrase.deck}
      display={token.text}
      hint={entry ? undefined : glossHint(token)}
      phrase={phrase}
      quiet
    >
      {token.text}
    </Word>
  );
}

/**
 * Греческая фраза: каждое слово нажимается отдельно (словарной формой),
 * фразу целиком можно добавить из окна любого слова. Одно слово — обычный Word.
 */
export function Phrase({ greek, russian, deck, wordDeck }: PhraseProps) {
  const tokens = analyzePhrase(greek);
  if (tokens.filter((t) => t.isWord).length <= 1) return <Word greek={greek} russian={russian} deck={deck} />;
  const phrase: PhraseRef = { greek, russian, deck };
  return (
    <span lang="el">
      {tokens.map((t, i) =>
        t.isWord ? <PhraseWord key={i} token={t} phrase={phrase} wordDeck={wordDeck} /> : <span key={i}>{t.text}</span>,
      )}
    </span>
  );
}

/** Рендер-функция для слотов renderGreek / renderWord. */
export const wordIn = (deck?: DeckRef, wordDeck?: PhraseProps['wordDeck']) =>
  function renderWord(greek: string, russian: string) {
    return <Phrase greek={greek} russian={russian} deck={deck} wordDeck={wordDeck} />;
  };
