import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { DeckRef } from '@/entities/card';
import type { FormNote } from '@/entities/dictionary';
import type { TextToken } from '@/entities/verb';
import { SpeakButton } from '@/features/pronounce';
import type { WordDeckFn } from '../lib/lessonWordGroups';
import { analyzePhrase, glossHint, lookupToken } from '../lib/lexicon';
import { WordCard } from './WordCard';
import { Arrow } from '@/shared/ui/ornament';
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
  /** «Почему так?» — почему форма на странице такая. */
  why?: FormNote;
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
export function Word({ greek, russian, deck, display, hint, phrase, quiet, why, children }: Props) {
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
              <WordCard
                greek={phrase.greek}
                russian={phrase.russian}
                deck={phrase.deck ?? deck}
                extra={
                  <button type="button" className={styles.linkBtn} onClick={() => setWholePhrase(false)}>
                    <Arrow direction="left" /> К слову
                  </button>
                }
              />
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
              <WordCard
                greek={greek}
                russian={russian}
                deck={deck}
                display={shown}
                hint={hint}
                why={why}
                extra={
                  phrase && (
                    <button type="button" className={styles.linkBtn} onClick={() => setWholePhrase(true)}>
                      Вся фраза <Arrow />
                    </button>
                  )
                }
              />
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
  /**
   * Подменить отдельное слово (пропуск в тексте, выбор слов в задании). index — номер токена во фразе.
   * undefined — обычное слово с переводом.
   */
  renderToken?: (token: TextToken, index: number) => ReactNode | undefined;
  /** Класс для обычного слова (оно остаётся нажимаемым с переводом): подсветка после ответа на задание. */
  tokenClass?: (token: TextToken, index: number) => string | undefined;
  /** Что-то сразу после фразы (кнопка озвучки): переносится только вместе с последним словом. */
  after?: ReactNode;
}

/** Слово из фразы: в карточку идёт словарная форма (глагол — начальная, сущ. — с артиклем). */
function PhraseWord({ token, phrase, wordDeck }: { token: TextToken; phrase?: PhraseRef; wordDeck: PhraseProps['wordDeck'] }) {
  const entry = lookupToken(token);
  return (
    <Word
      greek={entry?.greek ?? ''}
      russian={entry?.russian ?? ''}
      deck={(entry && wordDeck?.(entry)) ?? phrase?.deck}
      display={token.text}
      hint={entry ? undefined : glossHint(token)}
      phrase={phrase}
      why={entry?.why}
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
export function Phrase({ greek, russian, deck, wordDeck, renderToken, tokenClass, after }: PhraseProps) {
  const tokens = analyzePhrase(greek);
  if (!renderToken && tokens.filter((t) => t.isWord).length <= 1) {
    const word = <Word greek={greek} russian={russian} deck={deck} />;
    return after === undefined ? (
      word
    ) : (
      <span className={styles.tail}>
        {word}
        {after}
      </span>
    );
  }
  const phrase: PhraseRef = { greek, russian, deck };
  const renderAt = (t: TextToken, i: number) => {
    if (!t.isWord) return <span key={i}>{t.text}</span>;
    const custom = renderToken?.(t, i);
    if (custom !== undefined) return <span key={i}>{custom}</span>;
    const cls = tokenClass?.(t, i);
    const word = <PhraseWord key={i} token={t} phrase={phrase} wordDeck={wordDeck} />;
    return cls ? (
      <span key={i} className={cls}>
        {word}
      </span>
    ) : (
      word
    );
  };
  // Хвост — последнее слово, знаки после него и after — не разрываются переносом строки.
  let tail = tokens.length;
  if (after !== undefined) {
    tail = tokens.findLastIndex((t) => t.isWord);
    if (tail < 0) tail = tokens.length;
  }
  return (
    <span lang="el">
      {tokens.slice(0, tail).map((t, i) => renderAt(t, i))}
      {after !== undefined && (
        <span className={styles.tail}>
          {tokens.slice(tail).map((t, k) => renderAt(t, tail + k))}
          {after}
        </span>
      )}
    </span>
  );
}

const GREEK_RUN = /([\p{Script=Greek}]+(?:[ \u00a0]+[\p{Script=Greek}]+)*)/u;

/**
 * Русский текст с вкраплениями греческого (объяснения, конспекты): каждое греческое слово —
 * со словарной формой и переводом. Подряд идущие слова разбираются вместе (θα + глагол — будущее).
 */
export function GreekInline({ text, wordDeck }: { text: string; wordDeck?: WordDeckFn }) {
  return (
    <>
      {text.split(GREEK_RUN).map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : (
          <span key={i} lang="el">
            {analyzePhrase(part).map((t, j) =>
              t.isWord ? <PhraseWord key={j} token={t} wordDeck={wordDeck} /> : <span key={j}>{t.text}</span>,
            )}
          </span>
        ),
      )}
    </>
  );
}

/** Рендер-функция для слотов renderGreek / renderWord. */
export const wordIn = (deck?: DeckRef, wordDeck?: PhraseProps['wordDeck']) =>
  function renderWord(greek: string, russian: string) {
    return <Phrase greek={greek} russian={russian} deck={deck} wordDeck={wordDeck} />;
  };
