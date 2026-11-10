import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useCards, type DeckRef } from '@/entities/card';
import { setTextRead, useReadTexts } from '@/entities/library';
import { AddWords, TokenCard } from '@/features/card-add';
import { ReadingView } from '@/features/text-reading';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Button } from '@/shared/ui/button';
import { Arrow, Check } from '@/shared/ui/ornament';
import { allTexts, allVerbs, findText, levelTitle } from '../lib/catalog';
import { knownKeys, knownShare, lemmaKey, unknownWords } from '../lib/known';
import styles from './TextsPage.module.css';

/** Слова из раздела «Тексты» — в свой набор. */
const TEXTS_DECK: DeckRef = { id: 'texts', title: 'Из текстов' };
const deckFor = () => TEXTS_DECK;

export function TextPage() {
  const { textId = '' } = useParams();
  const text = findText(textId);
  const { cards } = useCards();
  const read = useReadTexts().includes(textId);
  const verbs = useMemo(() => allVerbs(), []);
  // Знакомые слова — на момент открытия: добавили слово в карточки — подсветка не прыгает.
  const [known] = useState(() => knownKeys(cards));
  const [highlight, setHighlight] = useState(false);

  if (!text) {
    return (
      <div className={styles.page}>
        <p className={styles.lead}>Такого текста нет.</p>
        <Link to={routes.texts()}>
          <Arrow direction="left" /> Ко всем текстам
        </Link>
      </div>
    );
  }

  const share = knownShare(text, known);
  const fresh = unknownWords(text, known);
  const list = allTexts();
  const next = list[list.findIndex((t) => t.id === text.id) + 1];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'Тексты', to: routes.texts() }, { label: text.title }]} />
        <p className={styles.kicker}>
          {text.genre} · {levelTitle(text.level).toLowerCase()}
        </p>
        <p className={styles.lead}>{text.summary}</p>
        {known.size > 0 && (
          <p className={styles.stats}>
            Знакомо {Math.round(share * 100)}% слов.{' '}
            <label className={styles.toggle}>
              <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
              Подсветить незнакомые
            </label>
          </p>
        )}
      </header>

      <ReadingView
        key={text.id}
        reading={text}
        verbs={verbs}
        renderAdd={(token) => <TokenCard token={token} deckFor={deckFor} />}
        markUnknown={
          highlight
            ? (token) => {
                const k = lemmaKey(token);
                return k !== null && !known.has(k);
              }
            : undefined
        }
      />

      <footer className={styles.finish}>
        {fresh.length > 0 && (
          <AddWords words={fresh} deckFor={deckFor} label="Новые слова текста — в карточки" doneLabel="Новые слова уже в карточках" />
        )}
        <div className={styles.finishRow}>
          {read ? (
            <span className={styles.readMark}>
              Прочитано <Check />{' '}
              <button type="button" className={styles.linkBtn} onClick={() => setTextRead(text.id, false)}>
                снять отметку
              </button>
            </span>
          ) : (
            <Button onClick={() => setTextRead(text.id, true)}>Прочитано</Button>
          )}
          {next && (
            <Link to={routes.text(next.id)} className={styles.next}>
              Дальше: <span lang="el">{next.title}</span> <Arrow />
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
