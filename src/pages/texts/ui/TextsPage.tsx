import { useMemo } from 'react';
import { Link } from 'react-router';
import { useCards } from '@/entities/card';
import { useReadTexts, type LibraryText } from '@/entities/library';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Check } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { allTexts, levelTitle } from '../lib/catalog';
import { knownKeys, knownShare, minutesOf } from '../lib/known';
import styles from './TextsPage.module.css';

/** Раздел «Тексты»: читать для удовольствия, уровни — рекомендация, а не замок. */
export function TextsPage() {
  const { cards } = useCards();
  const read = new Set(useReadTexts());
  const known = useMemo(() => knownKeys(cards), [cards]);
  const texts = allTexts();
  const levels = [...new Set(texts.map((t) => t.level))];
  const anyKnown = known.size > 0;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'Уроки', to: routes.home() }, { label: 'Тексты' }]} />
        <h1 className={styles.title}>Тексты</h1>
        <p className={styles.lead}>
          Истории, мифы, традиции и жизнь в Греции — короткие тексты, чтобы просто читать. Нажмите на слово — перевод,
          словарная форма и «в карточки». Процент — сколько слов вы уже встречали в уроках или учите в карточках.
        </p>
        <p className={styles.stats}>
          Прочитано: {texts.filter((t) => read.has(t.id)).length} из {texts.length}
        </p>
      </header>

      {levels.map((level) => (
        <section key={level} className={styles.section}>
          <h2 className={styles.levelTitle}>{levelTitle(level)}</h2>
          <ul className={styles.tiles}>
            {texts
              .filter((t) => t.level === level)
              .map((t) => (
                <TextTile key={t.id} text={t} read={read.has(t.id)} share={anyKnown ? knownShare(t, known) : null} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TextTile({ text, read, share }: { text: LibraryText; read: boolean; share: number | null }) {
  return (
    <li>
      <Link to={routes.text(text.id)} className={read ? `${styles.tile} ${styles.tileRead}` : styles.tile}>
        <span className={styles.genre}>{text.genre}</span>
        <span className={styles.tileTitle} lang="el">
          {text.title}
        </span>
        <span className={styles.summary}>{text.summary}</span>
        <span className={styles.meta}>
          ≈{minutesOf(text)} мин
          {read && (
            <span className={styles.readMark}>
              {' · '}прочитано <Check />
            </span>
          )}
        </span>
        {share !== null && (
          <span className={styles.known}>
            <ProgressBar value={share} thin />
            <span>знакомо {Math.round(share * 100)}%</span>
          </span>
        )}
      </Link>
    </li>
  );
}
