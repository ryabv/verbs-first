import { GreekInline, type WordDeckFn } from '@/features/card-add';
import styles from './Story.module.css';

/** **жирный**, `фрагмент` (окончание, основа — не слово), остальной греческий — слова с переводом. */
const MARK = /(\*\*[^*]+\*\*|`[^`]+`)/;

export function Rich({ text, wordDeck }: { text: string; wordDeck?: WordDeckFn }) {
  return (
    <>
      {text.split(MARK).map((part, i) => {
        if (part.startsWith('**')) {
          return (
            <b key={i}>
              <GreekInline text={part.slice(2, -2)} wordDeck={wordDeck} />
            </b>
          );
        }
        if (part.startsWith('`')) {
          return (
            <span key={i} className={styles.frag} lang="el">
              {part.slice(1, -1)}
            </span>
          );
        }
        return <GreekInline key={i} text={part} wordDeck={wordDeck} />;
      })}
    </>
  );
}
