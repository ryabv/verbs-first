import type { WordDeckFn } from '../lib/lessonWordGroups';
import { GreekInline } from './Word';
import styles from './Word.module.css';

/** **жирный**, `фрагмент` (окончание, основа — не слово), остальной греческий — слова с переводом. */
const MARK = /(\*\*[^*]+\*\*|`[^`]+`)/;

/** Русский текст с греческими словами (каждое — с переводом) и простой разметкой. */
export function RichText({ text, wordDeck }: { text: string; wordDeck?: WordDeckFn }) {
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
