import { useEffect, useRef, useState, type FormEvent } from 'react';
import { checkGreek, checkRussian, shuffle, type Card } from '@/entities/card';
import { SpeakButton } from '@/features/pronounce';
import type { AnswerVerdict } from '@/shared/lib/greek';
import { speak } from '@/shared/lib/speech';
import { Button } from '@/shared/ui/button';
import { GreekKeyboard, useGreekKeyboard } from '@/shared/ui/greek-keyboard';
import { SpeakerIcon } from '@/shared/ui/icon';
import { answerLanguage, type TrainingSettings } from '../model/settings';
import styles from './CardTrainer.module.css';

interface Props {
  card: Card;
  pool: readonly Card[];
  allCards: readonly Card[];
  settings: TrainingSettings;
  onResult: (correct: boolean) => void;
}

const VERDICT: Record<AnswerVerdict, string> = {
  correct: 'Верно!',
  accent: 'Почти! Посмотрите на написание',
  wrong: 'Не то — слово вернётся через пару карточек',
};

const OPTIONS = 4;

/** Одна карточка: вопрос в выбранном виде и ответ выбранным способом. */
export function CardQuestion({ card, pool, allCards, settings, onResult }: Props) {
  const lang = answerLanguage(settings);
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // После ответа фокус на «Дальше»: Enter сразу ведёт к следующей карточке.
  useEffect(() => {
    if (verdict) nextRef.current?.focus();
  }, [verdict]);

  // На слух: сразу проигрываем слово.
  useEffect(() => {
    if (settings.prompt === 'audio') void speak(card.greek);
  }, [settings.prompt, card.greek]);

  return (
    <div className={styles.card}>
      <div className={styles.promptBox}>
        {settings.prompt === 'ru' && <div className={styles.prompt}>{card.russian}</div>}
        {settings.prompt === 'gr' && (
          <div className={styles.prompt} lang="el">
            {card.greek} <SpeakButton text={card.greek} />
          </div>
        )}
        {settings.prompt === 'audio' && (
          <Button variant="secondary" onClick={() => void speak(card.greek)}>
            <SpeakerIcon className={styles.icon} /> Прослушать
          </Button>
        )}
        <div className={styles.hint}>{lang === 'gr' ? 'по-гречески' : 'перевод'}</div>
      </div>

      {settings.answer === 'choose' && (
        <Choose card={card} pool={pool} allCards={allCards} lang={lang} verdict={verdict} onVerdict={setVerdict} />
      )}
      {settings.answer === 'write' && <Write card={card} lang={lang} verdict={verdict} onVerdict={setVerdict} />}
      {settings.answer === 'self' && <SelfCheck card={card} onResult={onResult} />}

      {verdict && (
        <>
          <div className={`${styles.result} ${styles[verdict]}`}>
            <strong>{VERDICT[verdict]}</strong>
            <Reveal card={card} />
          </div>
          <Button ref={nextRef} className={styles.next} onClick={() => onResult(verdict !== 'wrong')}>
            Дальше
          </Button>
        </>
      )}
    </div>
  );
}

function Reveal({ card }: { card: Card }) {
  return (
    <div className={styles.reveal}>
      <span lang="el" className={styles.revealGreek}>
        {card.greek}
      </span>
      <SpeakButton text={card.greek} />
      <span className={styles.revealRussian}>— {card.russian}</span>
    </div>
  );
}

// ---------- выбрать из вариантов ----------

interface AnswerProps {
  card: Card;
  lang: 'gr' | 'ru';
  verdict: AnswerVerdict | null;
  onVerdict: (v: AnswerVerdict) => void;
}

function Choose({
  card,
  pool,
  allCards,
  lang,
  verdict,
  onVerdict,
}: AnswerProps & { pool: readonly Card[]; allCards: readonly Card[] }) {
  const textOf = (c: Card) => (lang === 'gr' ? c.greek : c.russian);
  const [picked, setPicked] = useState<string | null>(null);

  // Варианты считаются один раз: карточка пересоздаётся (key) на каждый показ.
  const [options] = useState(() => {
    const right = lang === 'gr' ? card.greek : card.russian;
    const seen = new Set([right]);
    const wrong: string[] = [];
    // Сначала слова из этой же сессии, потом из всех карточек.
    for (const c of [...shuffle(pool), ...shuffle(allCards)]) {
      const text = lang === 'gr' ? c.greek : c.russian;
      if (seen.has(text)) continue;
      seen.add(text);
      wrong.push(text);
      if (wrong.length === OPTIONS - 1) break;
    }
    return shuffle([right, ...wrong]);
  });

  const right = textOf(card);

  return (
    <div className={styles.options}>
      {options.map((text) => {
        const state = !verdict ? '' : text === right ? styles.optRight : text === picked ? styles.optWrong : '';
        return (
          <button
            key={text}
            type="button"
            lang={lang === 'gr' ? 'el' : 'ru'}
            className={`${styles.optionBtn} ${state}`}
            disabled={verdict !== null}
            onClick={() => {
              setPicked(text);
              onVerdict(text === right ? 'correct' : 'wrong');
            }}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

// ---------- написать ----------

function Write({ card, lang, verdict, onVerdict }: AnswerProps) {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboard = useGreekKeyboard();

  useEffect(() => {
    if (keyboard.autoFocus) inputRef.current?.focus();
  }, [keyboard.autoFocus]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (verdict || !answer.trim()) return;
    onVerdict(lang === 'gr' ? checkGreek(answer, card.greek) : checkRussian(answer, card.russian));
  };

  return (
    <>
      <form className={styles.form} onSubmit={onSubmit}>
        <input
          ref={inputRef}
          className={styles.input}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={lang === 'gr' ? 'По-гречески…' : 'Перевод…'}
          lang={lang === 'gr' ? 'el' : 'ru'}
          inputMode={lang === 'gr' ? keyboard.inputMode : 'text'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          readOnly={verdict !== null}
        />
        {!verdict && (
          <Button type="submit" disabled={!answer.trim()} onMouseDown={(e) => e.preventDefault()}>
            Проверить
          </Button>
        )}
      </form>
      {lang === 'gr' && !verdict && (
        <GreekKeyboard
          open={keyboard.open}
          onToggle={keyboard.toggle}
          onKey={(ch) => setAnswer(answer + ch)}
          onBackspace={() => setAnswer(answer.slice(0, -1))}
        />
      )}
    </>
  );
}

// ---------- вспомнить и проверить себя ----------

function SelfCheck({ card, onResult }: { card: Card; onResult: (ok: boolean) => void }) {
  const [shown, setShown] = useState(false);
  if (!shown) {
    return (
      <Button variant="secondary" onClick={() => setShown(true)}>
        Показать ответ
      </Button>
    );
  }
  return (
    <>
      <div className={styles.selfAnswer}>
        <Reveal card={card} />
      </div>
      <div className={styles.selfButtons}>
        <Button onClick={() => onResult(true)}>Помню</Button>
        <Button variant="secondary" onClick={() => onResult(false)}>
          Не вспомнил(а)
        </Button>
      </div>
    </>
  );
}
