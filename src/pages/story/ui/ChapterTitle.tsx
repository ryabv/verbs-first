import { useState } from 'react';
import type { StoryChapter } from '@/entities/story';
import { Phrase } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { storyDeck, STORY_DECK } from '../lib/deck';
import { TranslateButton } from './TranslateButton';
import styles from './Story.module.css';

/** Название главы над текстом: слова с переводом, озвучка и перевод названия — как у предложений. */
export function ChapterTitle({ chapter, className }: { chapter: StoryChapter; className?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className={className ? `${styles.textHead} ${className}` : styles.textHead}>
      <h2 className={styles.textTitle}>
        <Phrase
          greek={chapter.title}
          russian={chapter.titleRu}
          deck={STORY_DECK}
          wordDeck={storyDeck}
          after={
            <>
              <SpeakButton text={chapter.title} />
              <TranslateButton shown={shown} onToggle={() => setShown((v) => !v)} />
            </>
          }
        />
      </h2>
      {shown && <span className={styles.translation}>{chapter.titleRu}</span>}
    </div>
  );
}
