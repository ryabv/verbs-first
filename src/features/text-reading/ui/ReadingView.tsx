import { useMemo, useState, type ReactNode } from 'react';
import type { ReadingText } from '@/entities/lesson';
import { createAnalyzer, TENSE_LABELS, type TextToken, type Verb } from '@/entities/verb';
import { SpeakButton } from '@/features/pronounce';
import { Button } from '@/shared/ui/button';
import { describeVerb } from '../model/describe';
import styles from './ReadingView.module.css';

interface Props {
  reading: ReadingText;
  /** Глаголы, формы которых распознаются в тексте. */
  verbs: readonly Verb[];
  /** Слот в панели разбора: добавить слово в карточки (словарной формой). */
  renderAdd?: (token: TextToken) => ReactNode;
}

type Mode = 'read' | 'find';
type WordId = string; // "<номер предложения>:<номер токена>"

export function ReadingView({ reading, verbs, renderAdd }: Props) {
  const analyze = useMemo(() => createAnalyzer(verbs), [verbs]);
  const sentences = useMemo(() => reading.sentences.map((s) => analyze(s.greek)), [analyze, reading]);

  const [showTranslation, setShowTranslation] = useState(false);
  const [selected, setSelected] = useState<{ id: WordId; token: TextToken } | null>(null);
  const [mode, setMode] = useState<Mode>('read');
  const [picked, setPicked] = useState<Set<WordId>>(new Set());
  const [checked, setChecked] = useState(false);

  const target = useMemo(() => {
    const ids = new Set<WordId>();
    if (!reading.findTense) return ids;
    sentences.forEach((tokens, si) =>
      tokens.forEach((t, ti) => t.verb?.tense === reading.findTense && ids.add(`${si}:${ti}`)),
    );
    return ids;
  }, [sentences, reading.findTense]);

  const onWord = (id: WordId, token: TextToken) => {
    if (mode === 'read') {
      setSelected(selected?.id === id ? null : { id, token });
      return;
    }
    if (checked) return;
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const wordClass = (id: WordId) => {
    if (mode === 'read') return selected?.id === id ? `${styles.word} ${styles.selected}` : styles.word;
    if (!checked) return picked.has(id) ? `${styles.word} ${styles.picked}` : styles.word;
    if (picked.has(id)) return `${styles.word} ${target.has(id) ? styles.right : styles.wrong}`;
    return target.has(id) ? `${styles.word} ${styles.missed}` : styles.word;
  };

  const found = [...picked].filter((id) => target.has(id)).length;
  const extra = picked.size - found;
  const fullText = reading.sentences.map((s) => s.greek).join(' ');

  return (
    <div className={styles.reading}>
      <div className={styles.toolbar}>
        <span className={styles.listen}>
          Слушать весь текст <SpeakButton text={fullText} />
        </span>
        <label className={styles.toggle}>
          <input type="checkbox" checked={showTranslation} onChange={(e) => setShowTranslation(e.target.checked)} />
          Перевод
        </label>
      </div>

      <h2 className={styles.title}>{reading.title}</h2>

      <div className={styles.text}>
        {sentences.map((tokens, si) => (
          <p key={si} className={styles.sentence}>
            <span>
              {tokens.map((token, ti) =>
                token.isWord ? (
                  <button
                    key={ti}
                    type="button"
                    className={wordClass(`${si}:${ti}`)}
                    onClick={() => onWord(`${si}:${ti}`, token)}
                  >
                    {token.text}
                  </button>
                ) : (
                  <span key={ti}>{token.text}</span>
                ),
              )}
              <SpeakButton text={reading.sentences[si]!.greek} />
            </span>
            {showTranslation && <span className={styles.translation}>{reading.sentences[si]!.russian}</span>}
          </p>
        ))}
      </div>

      {mode === 'read' && (
        <div className={styles.gloss} aria-live="polite">
          {selected ? (
            <>
              <b>{selected.token.text}</b> —{' '}
              {selected.token.verb
                ? describeVerb(selected.token.verb)
                : (reading.glossary[selected.token.key] ?? 'нет в словаре урока')}
              {renderAdd && <div className={styles.glossAdd}>{renderAdd(selected.token)}</div>}
            </>
          ) : (
            <span className={styles.muted}>Нажмите на слово, чтобы увидеть перевод и разбор.</span>
          )}
        </div>
      )}

      {reading.findTense && (
        <section className={styles.block}>
          <h3>Разбор: найдите все глаголы — {TENSE_LABELS[reading.findTense].toLowerCase()} время</h3>
          {mode === 'read' ? (
            <Button
              variant="secondary"
              onClick={() => {
                setMode('find');
                setSelected(null);
              }}
            >
              Начать разбор
            </Button>
          ) : (
            <>
              <p className={styles.muted}>Нажимайте на слова в тексте выше, потом — «Проверить».</p>
              <div className={styles.findActions}>
                {!checked ? (
                  <Button onClick={() => setChecked(true)} disabled={picked.size === 0}>
                    Проверить
                  </Button>
                ) : (
                  <>
                    <span className={found === target.size && extra === 0 ? styles.ok : styles.muted}>
                      Найдено {found} из {target.size}
                      {extra > 0 && `, лишних: ${extra}`}
                      {found === target.size && extra === 0 && ' — отлично!'}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPicked(new Set());
                        setChecked(false);
                      }}
                    >
                      Ещё раз
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode('read');
                    setPicked(new Set());
                    setChecked(false);
                  }}
                >
                  Вернуться к чтению
                </Button>
              </div>
              {checked && (
                <p className={styles.legend}>
                  <span className={styles.right}>верно</span> <span className={styles.wrong}>лишнее</span>{' '}
                  <span className={styles.missed}>пропущено</span>
                </p>
              )}
            </>
          )}
        </section>
      )}

      {reading.questions.length > 0 && (
        <section className={styles.block}>
          <h3>Вопросы к тексту</h3>
          <ol className={styles.questions}>
            {reading.questions.map((q, qi) => (
              <Question key={qi} question={q.question} options={q.options} answer={q.answer} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Question({ question, options, answer }: { question: string; options: string[]; answer: number }) {
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <li className={styles.question}>
      <div>{question}</div>
      <div className={styles.options}>
        {options.map((option, i) => {
          const state =
            choice === null ? '' : i === answer ? styles.optionRight : i === choice ? styles.optionWrong : '';
          return (
            <button
              key={i}
              type="button"
              className={`${styles.option} ${state}`}
              onClick={() => setChoice(i)}
              disabled={choice !== null && choice === answer}
            >
              {option}
            </button>
          );
        })}
      </div>
    </li>
  );
}
