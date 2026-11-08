import { useEffect, useMemo, useState } from 'react';
import { PhraseList, type CompositionCheck, type Phrase } from '@/entities/lesson';
import { createAnalyzer, type Verb } from '@/entities/verb';
import { SpeakButton } from '@/features/pronounce';
import { runChecks } from '../model/check';
import styles from './CompositionEditor.module.css';

interface Props {
  /** Ключ черновика в localStorage. */
  draftKey: string;
  task: string;
  sample: Phrase[];
  checklist: CompositionCheck[];
  verbs: readonly Verb[];
}

function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Сочинение с чеклистом, который отмечается сам по формам глаголов урока. */
export function CompositionEditor({ draftKey, task, sample, checklist, verbs }: Props) {
  const [text, setText] = useState(() => readDraft(draftKey));
  const analyze = useMemo(() => createAnalyzer(verbs), [verbs]);
  const results = useMemo(() => runChecks(text, checklist, analyze), [text, checklist, analyze]);
  const done = results.filter((r) => r.ok).length;

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, text);
    } catch {
      /* черновик не критичен */
    }
  }, [draftKey, text]);

  return (
    <div className={styles.editor}>
      <p>{task}</p>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Γεια σας! Με λένε…"
        lang="el"
        rows={7}
      />
      {text.trim() && (
        <div className={styles.listen}>
          Послушать свой текст <SpeakButton text={text} />
        </div>
      )}

      <div className={styles.checklist}>
        <div className={styles.checklistHead}>
          Проверка: {done} из {results.length}
          {done === results.length && <span className={styles.allDone}> — всё на месте!</span>}
        </div>
        <ul>
          {results.map((r) => (
            <li key={r.label} className={r.ok ? styles.ok : undefined}>
              <span className={styles.mark}>{r.ok ? '✓' : '○'}</span>
              {r.label}
              {r.evidence && <span className={styles.evidence}>{r.evidence}</span>}
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Проверяются только формы глаголов этого урока. Грамматику остальных слов программа пока не оценивает.
        </p>
      </div>

      <details className={styles.sample}>
        <summary>Посмотреть пример</summary>
        <PhraseList phrases={sample} renderAction={(t) => <SpeakButton text={t} />} />
      </details>
    </div>
  );
}
