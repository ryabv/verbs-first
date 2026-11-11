import type { ReactNode } from 'react';
import type { StoryChapter } from '@/entities/story';
import { Meander } from '@/shared/ui/ornament';
import { PlaceImage } from './PlaceImage';
import styles from './Story.module.css';

/**
 * Текст главы как страница рукописи: пергамент в двойной рамке, сверху — картинка места,
 * тающая в бумагу, и полоса меандра. Чтобы чтение ощущалось частью истории, а не упражнением.
 */
export function Manuscript({ chapter, className, label, children }: { chapter: StoryChapter; className?: string; label?: string; children: ReactNode }) {
  return (
    <aside className={className ? `${styles.manuscript} ${className}` : styles.manuscript} aria-label={label}>
      {chapter.image && <PlaceImage key={chapter.id} image={chapter.image} className={styles.manuscriptImage} eager />}
      <Meander className={styles.manuscriptMeander} />
      {children}
    </aside>
  );
}
