import { useState } from 'react';
import type { DeckRef } from '@/entities/card';
import type { TextToken } from '@/entities/verb';
import { stripAccents } from '@/shared/lib/greek';
import { glossHint, lookupToken } from '../lib/lexicon';
import type { WordDeckFn } from '../lib/lessonWordGroups';
import { AddToCards } from './AddToCards';
import styles from './Word.module.css';

interface Props {
  /** Словарная форма; пусто — её нет в словаре. */
  greek: string;
  russian: string;
  deck?: DeckRef;
  /** Как слово написано на странице. */
  display?: string;
  hint?: string;
}

/**
 * Содержимое окна слова: что именно попадёт в карточку (словарная форма) и наборы.
 * Нет словарной формы — ученик вписывает её и перевод сам; форму из текста не кладём молча.
 */
export function WordCard({ greek, russian, deck, display, hint }: Props) {
  if (!greek) return <OwnWord display={display ?? ''} hint={hint} deck={deck} />;
  const isBase = !display || stripAccents(display) === stripAccents(greek);
  return (
    <>
      {isBase ? (
        <span className={styles.popRussian}>{russian}</span>
      ) : (
        <span className={styles.popRussian}>
          <span className={styles.baseLabel}>словарная форма </span>
          <span lang="el" className={styles.base}>
            {greek}
          </span>{' '}
          — {russian}
        </span>
      )}
      <AddToCards greek={greek} russian={russian} deck={deck} />
    </>
  );
}

function OwnWord({ display, hint, deck }: { display: string; hint?: string; deck?: DeckRef }) {
  const [greek, setGreek] = useState(display.toLowerCase());
  const [russian, setRussian] = useState('');
  return (
    <>
      <span className={styles.popRussian}>
        {hint ? `${hint}. ` : ''}Этого слова нет в словаре — впишите словарную форму и перевод.
      </span>
      <span className={styles.ownFields}>
        <input
          className={styles.newDeckInput}
          value={greek}
          onChange={(e) => setGreek(e.target.value)}
          aria-label="Словарная форма"
          placeholder="Словарная форма"
          lang="el"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <input
          className={styles.newDeckInput}
          value={russian}
          onChange={(e) => setRussian(e.target.value)}
          aria-label="Перевод"
          placeholder="Перевод"
          autoComplete="off"
        />
      </span>
      <AddToCards greek={greek} russian={russian} deck={deck} />
    </>
  );
}

/** Для панели разбора слова в тексте: словарная форма слова-токена и наборы. */
export function TokenCard({ token, deckFor }: { token: TextToken; deckFor?: WordDeckFn }) {
  const entry = lookupToken(token);
  return (
    <WordCard
      key={token.key}
      greek={entry?.greek ?? ''}
      russian={entry?.russian ?? ''}
      deck={entry && deckFor?.(entry)}
      display={token.text}
      hint={entry ? undefined : glossHint(token)}
    />
  );
}
