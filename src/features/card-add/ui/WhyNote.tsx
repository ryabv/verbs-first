import { useState } from 'react';
import { Link } from 'react-router';
import type { FormNote } from '@/entities/dictionary';
import { getGrammarTopic, plainTitle } from '@/entities/grammar';
import { routes } from '@/shared/config/routes';
import { Arrow } from '@/shared/ui/ornament';
import styles from './Word.module.css';

/** Греческие куски пояснения (формы, окончания) — выделены, без своего окна: оно уже внутри окна слова. */
const GREEK = /(-?[\p{Script=Greek}]+(?:[  ]+[\p{Script=Greek}]+)*)/u;

function NoteText({ text }: { text: string }) {
  return (
    <>
      {text.split(GREEK).map((part, i) =>
        i % 2 ? (
          <span key={i} className={styles.frag} lang="el">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** «Почему так?» в окне слова: свёрнуто; раскрывается в одну-две строки и ссылку на правило справочника. */
export function WhyNote({ why }: { why: FormNote }) {
  const [open, setOpen] = useState(false);
  const [topicId = '', ruleId = ''] = why.rule.split('#');
  const rule = getGrammarTopic(topicId)?.rules.find((r) => r.id === ruleId);
  return (
    <span className={styles.why}>
      <button type="button" className={styles.whyToggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Почему так?
      </button>
      {open && (
        <span className={styles.whyBody}>
          <span>
            <NoteText text={why.note} />
          </span>
          {rule && (
            <Link className={styles.whyLink} to={routes.grammar(topicId, ruleId)}>
              Справочник: {plainTitle(rule.title)} <Arrow />
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
