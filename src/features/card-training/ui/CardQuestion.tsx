import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { checkGreek, shuffle, stageOf, type Card, type Stage } from '@/entities/card';
import { SpeakButton } from '@/features/pronounce';
import type { AnswerVerdict } from '@/shared/lib/greek';
import { Button } from '@/shared/ui/button';
import { GreekKeyboard, useGreekKeyboard } from '@/shared/ui/greek-keyboard';
import { pickSentence, type SentenceSource, type WordSentence } from '../model/sentences';
import type { Outcome } from '../model/useSession';
import styles from './CardTrainer.module.css';

interface Props {
  card: Card;
  sentences: SentenceSource;
  /** Все карточки — переводы и слова для вариантов ответа. */
  allCards: readonly Card[];
  /** Знакомство показано (фразы — какие). */
  onMeet: (sentences: string[]) => void;
  /** Ответ дан (сразу, до «Дальше»): верно ли и в какой фразе. */
  onAnswer: (correct: boolean, sentence?: string) => void;
  /** «Дальше». */
  onNext: (outcome: Outcome) => void;
  /** Ступень, если её задаёт вызывающий (истории); иначе — по прочности слова. */
  stage?: Stage;
  /** Без рамки — когда карточка внутри другого блока (задание дня). */
  bare?: boolean;
}

const VERDICT: Record<AnswerVerdict, string> = {
  correct: 'Верно!',
  accent: 'Почти! Посмотрите на написание',
  wrong: 'Не то — слово скоро вернётся',
};

const OPTIONS = 4;

/**
 * Карточка — ступень по тому, насколько прочно слово держится (docs/product/cards.md):
 * знакомство (слово и фразы с ним, без вопроса) → узнать слово во фразе → вспомнить его в пропуске → написать.
 * Каждый раз — другая фраза из глав: учим, как слово употребляется, а не одну фразу.
 */
export function CardQuestion({ card, sentences, allCards, onMeet, onAnswer, onNext, stage: forced, bare = false }: Props) {
  // Ступень и фраза выбираются один раз на показ: ответ меняет прочность слова, но не текущий вопрос.
  const [stage] = useState(() => forced ?? stageOf(card));
  const all = sentences.sentencesFor(card.greek);
  const frame = bare ? `${styles.card} ${styles.bare}` : styles.card!;
  if (stage === 'intro') return <Intro card={card} examples={all} frame={frame} onMeet={onMeet} onNext={onNext} />;
  return <Check card={card} stage={stage} examples={all} allCards={allCards} frame={frame} onAnswer={onAnswer} onNext={onNext} />;
}

// ---------- знакомство ----------

function Intro({ card, examples, frame, onMeet, onNext }: { card: Card; examples: readonly WordSentence[]; frame: string; onMeet: Props['onMeet']; onNext: Props['onNext'] }) {
  const [shown] = useState(() => {
    const first = pickSentence(examples, card.shown);
    const second = first && pickSentence(examples, card.shown, [first.greek]);
    return [first, second].filter((s): s is WordSentence => s !== undefined);
  });
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => nextRef.current?.focus(), []);
  const done = () => {
    onMeet(shown.map((s) => s.greek));
    onNext('met');
  };
  return (
    <div className={frame}>
      <div className={styles.stage}>Новое слово</div>
      <div className={styles.promptBox}>
        <div className={styles.prompt} lang="el">
          {card.greek} <SpeakButton text={card.greek} />
        </div>
        <div className={styles.meaning}>{card.russian}</div>
      </div>
      {shown.length > 0 && (
        <div className={styles.examples}>
          <div className={styles.examplesLabel}>Как его употребляют</div>
          {shown.map((s) => (
            <Example key={s.greek} sentence={s} />
          ))}
        </div>
      )}
      <Button ref={nextRef} className={styles.next} onClick={done}>
        Запомнил(а), дальше
      </Button>
    </div>
  );
}

/** Фраза со словом: слово выделено, озвучка, перевод. */
function Example({ sentence, translated = true }: { sentence: WordSentence; translated?: boolean }) {
  return (
    <div className={styles.example}>
      <div className={styles.exampleGreek} lang="el">
        <SentenceText sentence={sentence} /> <SpeakButton text={sentence.greek} />
      </div>
      {translated && <div className={styles.exampleRussian}>{sentence.russian}</div>}
      <div className={styles.exampleSource}>{sentence.source}</div>
    </div>
  );
}

function SentenceText({ sentence, gap = false }: { sentence: WordSentence; gap?: boolean }) {
  return (
    <>
      {sentence.parts.map((p, i) =>
        p.target ? (
          gap ? (
            <span key={i} className={styles.gap} aria-label="пропуск">
              {' '.repeat(Math.max(4, p.text.length))}
            </span>
          ) : (
            <mark key={i} className={styles.target}>
              {p.text}
            </mark>
          )
        ) : (
          p.text
        ),
      )}
    </>
  );
}

// ---------- проверка ----------

interface CheckProps {
  card: Card;
  stage: Exclude<Stage, 'intro'>;
  examples: readonly WordSentence[];
  allCards: readonly Card[];
  frame: string;
  onAnswer: Props['onAnswer'];
  onNext: Props['onNext'];
}

/** Как спрашиваем: какая фраза, что показываем, из чего выбираем. */
interface Ask {
  sentence?: WordSentence;
  label: string;
  prompt: ReactNode;
  /** Варианты (выбор) или ничего (письмо). */
  options?: string[];
  right: string;
  lang: 'el' | 'ru';
}

function makeAsk(card: Card, stage: CheckProps['stage'], examples: readonly WordSentence[], allCards: readonly Card[]): Ask {
  const others = (text: (c: Card) => string) => {
    const right = text(card);
    const out = new Set<string>();
    for (const c of shuffle(allCards)) {
      const t = text(c);
      if (t !== right) out.add(t);
      if (out.size === OPTIONS - 1) break;
    }
    return shuffle([right, ...out]);
  };
  if (stage === 'recognize') {
    const sentence = pickSentence(examples, card.shown);
    return {
      sentence,
      label: sentence ? 'Что значит выделенное слово?' : 'Что значит слово?',
      prompt: sentence ? (
        <span lang="el">
          <SentenceText sentence={sentence} /> <SpeakButton text={sentence.greek} />
        </span>
      ) : (
        <span lang="el">
          {card.greek} <SpeakButton text={card.greek} />
        </span>
      ),
      options: others((c) => c.russian),
      right: card.russian,
      lang: 'ru',
    };
  }
  if (stage === 'recall') {
    // Пропуск — только если нашлись ловушки той же формы; иначе — русское слово → греческое.
    const sentence = pickSentence(
      examples.filter((s) => s.decoys.length >= OPTIONS - 1),
      card.shown,
    );
    if (sentence) {
      return {
        sentence,
        label: 'Какое слово пропущено?',
        prompt: (
          <>
            <span lang="el">
              <SentenceText sentence={sentence} gap />
            </span>
            <span className={styles.promptRussian}>{sentence.russian}</span>
          </>
        ),
        options: shuffle([sentence.form, ...sentence.decoys.slice(0, OPTIONS - 1)]),
        right: sentence.form,
        lang: 'el',
      };
    }
    return { label: 'Как это по-гречески?', prompt: card.russian, options: others((c) => c.greek), right: card.greek, lang: 'el' };
  }
  // Написать: словарная форма по-русскому слову; фраза — после ответа, как пример.
  return { sentence: pickSentence(examples, card.shown), label: 'Напишите по-гречески', prompt: card.russian, right: card.greek, lang: 'el' };
}

function Check({ card, stage, examples, allCards, frame, onAnswer, onNext }: CheckProps) {
  const [ask] = useState(() => makeAsk(card, stage, examples, allCards));
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (verdict) nextRef.current?.focus();
  }, [verdict]);

  const answer = (v: AnswerVerdict) => {
    setVerdict(v);
    onAnswer(v !== 'wrong', ask.sentence?.greek);
  };
  const pick = (text: string) => {
    if (verdict) return;
    setPicked(text);
    answer(text === ask.right ? 'correct' : 'wrong');
  };

  // Клавиши 1–4 — варианты по порядку.
  useEffect(() => {
    if (verdict || !ask.options) return;
    const options = ask.options;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea')) return;
      const option = options[Number(e.key) - 1];
      if (option) pick(option);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={frame}>
      <div className={styles.stage}>{ask.label}</div>
      <div className={ask.sentence && stage !== 'write' ? `${styles.promptBox} ${styles.promptSentence}` : styles.promptBox}>
        <div className={styles.prompt}>{ask.prompt}</div>
      </div>

      {ask.options ? (
        <div className={styles.options}>
          {ask.options.map((text, i) => {
            const state = !verdict ? '' : text === ask.right ? styles.optRight : text === picked ? styles.optWrong : '';
            return (
              <button key={text} type="button" lang={ask.lang} className={`${styles.optionBtn} ${state}`} disabled={verdict !== null} onClick={() => pick(text)}>
                <kbd className={styles.key}>{i + 1}</kbd>
                {text}
              </button>
            );
          })}
        </div>
      ) : (
        <Write right={card.greek} verdict={verdict} onVerdict={answer} />
      )}

      {verdict && (
        <>
          <div className={`${styles.result} ${styles[verdict]}`}>
            <strong>{VERDICT[verdict]}</strong>
            <div className={styles.reveal}>
              <span lang="el" className={styles.revealGreek}>
                {card.greek}
              </span>
              <SpeakButton text={card.greek} />
              <span className={styles.revealRussian}>— {card.russian}</span>
            </div>
          </div>
          {ask.sentence && (
            <div className={styles.examples}>
              <Example sentence={ask.sentence} />
            </div>
          )}
          <Button ref={nextRef} className={styles.next} onClick={() => onNext(verdict === 'wrong' ? 'wrong' : 'right')}>
            Дальше
          </Button>
        </>
      )}
    </div>
  );
}

// ---------- написать ----------

function Write({ right, verdict, onVerdict }: { right: string; verdict: AnswerVerdict | null; onVerdict: (v: AnswerVerdict) => void }) {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboard = useGreekKeyboard();

  useEffect(() => {
    if (keyboard.autoFocus) inputRef.current?.focus();
  }, [keyboard.autoFocus]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (verdict || !answer.trim()) return;
    onVerdict(checkGreek(answer, right));
  };

  return (
    <>
      <form className={styles.form} onSubmit={onSubmit}>
        <input
          ref={inputRef}
          className={styles.input}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="По-гречески…"
          lang="el"
          inputMode={keyboard.inputMode}
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
      {!verdict && (
        <GreekKeyboard open={keyboard.open} onToggle={keyboard.toggle} onKey={(ch) => setAnswer(answer + ch)} onBackspace={() => setAnswer(answer.slice(0, -1))} />
      )}
      {!verdict && /^(ο|η|το|οι|τα) /.test(right) && <p className={styles.writeHint}>Существительное — можно с артиклем или без.</p>}
    </>
  );
}
