import { useState, type ReactNode } from 'react';
import type { StoryFind } from '../model/types';
import { FindThumb, FindViewer } from './FindModel';
import styles from './FindShelf.module.css';

const plain = (text: string): ReactNode => text;

export interface ShelfFind {
  chapter: number;
  find: StoryFind;
}

/**
 * Полка находок (docs/product/finds.md): 3D-миниатюры по две в ряд, ненайденные — «?». Нажатие — предмет крупно
 * (вертеть рукой), название, глава и текст. Используется на карте «Истории» и в «Коллекции» Профиля.
 * `renderText` — слот для текста находки (греческие слова — с переводом, через features).
 */
export function FindShelf({
  finds,
  planned,
  heading = 'h2',
  renderText = plain,
  listClassName,
}: {
  finds: readonly ShelfFind[];
  planned: number;
  heading?: 'h2' | 'h3';
  renderText?: (text: string) => ReactNode;
  /** Класс списка — например, чтобы он прокручивался внутри карточки на карте. */
  listClassName?: string;
}) {
  const [open, setOpen] = useState<number>();
  const chosen = finds.find((f) => f.chapter === open);
  const Heading = heading;
  if (chosen) {
    return (
      <div className={styles.body}>
        <button type="button" className={styles.back} onClick={() => setOpen(undefined)}>
          ← Все находки
        </button>
        <FindViewer icon={chosen.find.icon} reveal className={styles.stage} />
        <p className={styles.name}>
          <b>{chosen.find.title}</b> <span className={styles.chapter}>· глава {chosen.chapter}</span>
        </p>
        <p className={styles.desc}>{renderText(chosen.find.text)}</p>
      </div>
    );
  }
  return (
    <div className={styles.body}>
      <Heading className={styles.title}>
        Находки <span className={styles.count}>{finds.length} из {planned}</span>
      </Heading>
      <ul className={[styles.shelf, listClassName].filter(Boolean).join(' ')}>
        {finds.map((f) => (
          <li key={f.chapter}>
            <button type="button" className={styles.item} onClick={() => setOpen(f.chapter)}>
              <FindThumb icon={f.find.icon} className={styles.thumb} />
              <span className={styles.label}>{f.find.title}</span>
            </button>
          </li>
        ))}
        {Array.from({ length: Math.max(0, planned - finds.length) }, (_, i) => (
          <li key={`empty-${i}`} className={styles.empty} aria-hidden="true">
            ?
          </li>
        ))}
      </ul>
      <p className={styles.hint}>{finds.length === 0 ? 'Дочитайте главу — её находка появится здесь.' : 'Нажмите на предмет, чтобы рассмотреть его.'}</p>
    </div>
  );
}
