import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { SpeakButton } from '@/features/pronounce';
import { compareAnswer, type AnswerVerdict } from '@/shared/lib/greek';
import { speak } from '@/shared/lib/speech';
import { Button } from '@/shared/ui/button';
import { Check, Column, Wreath } from '@/shared/ui/ornament';
import { GreekKeyboard, useGreekKeyboard } from '@/shared/ui/greek-keyboard';
import { SpeakerIcon } from '@/shared/ui/icon';
import { PASS_PERCENT, readExamResult, saveExamResult, type ExamId } from '../model/result';
import type { ChoiceQuestion, ExamQuestion, ExamWord, WriteQuestion } from '../model/types';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './Exam.module.css';

/** Сколько раз можно прослушать фразу диктанта. */
export const MAX_LISTENS = 2;

interface Answer {
  question: ExamQuestion;
  /** Что ответил ученик (текст или вариант). */
  given: string;
  verdict: AnswerVerdict;
}

interface Props {
  /** Номер урока или 'alphabet' — под ним хранится лучший результат. */
  id: ExamId;
  title: string;
  /** Собрать задания (каждая попытка — новый набор). */
  build: () => ExamQuestion[];
  /** Правила этого экзамена (общие — порог и «разбор в конце» — добавляются сами). */
  rules: ReactNode[];
  /** Слот: отправить слова из ошибок в карточки. */
  renderWords?: (words: ExamWord[]) => ReactNode;
  /** Ссылки после экзамена (к уроку, к следующему уроку). */
  actions?: ReactNode;
  /** Экзамен сдан (в этой попытке или раньше) — например, засчитать шаг урока. */
  onPassed?: () => void;
}

/**
 * Экзамен — отдельный тип, строже тренировок: без подсказок, без ответа по ходу
 * (разбор — в конце), назад не вернуться, сдан — от PASS_PERCENT %.
 */
export function Exam({ id, title, build, rules, renderWords, actions, onPassed }: Props) {
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<{ percent: number; record: boolean } | null>(null);
  const [prev, setPrev] = useState(() => readExamResult(id));

  const start = () => {
    setQuestions(build());
    setAnswers([]);
    setResult(null);
  };

  if (!questions) {
    return (
      <div className={styles.card}>
        <h2 className={styles.introTitle}>
          <Column className={styles.introIcon} size="1.6rem" />
          {title}
        </h2>
        <ul className={styles.rules}>
          {rules.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
          <li>Без подсказок. Верно или нет — узнаете в конце, там же разбор ошибок.</li>
          <li>Вернуться к заданию нельзя.</li>
          <li>Экзамен сдан, если верно {PASS_PERCENT}% и больше.</li>
        </ul>
        {prev && (
          <p className={styles.prev}>
            Ваш лучший результат: {prev.best}% {prev.passed ? <>— сдан <Check /></> : '— пока не сдан'}
          </p>
        )}
        <Button onClick={start}>Начать экзамен</Button>
      </div>
    );
  }

  const index = answers.length;
  const current = questions[index];

  const submit = (given: string, verdict: AnswerVerdict) => {
    const next = [...answers, { question: questions[index]!, given, verdict }];
    setAnswers(next);
    if (next.length === questions.length) {
      const correct = next.filter((a) => a.verdict === 'correct').length;
      const percent = Math.round((correct / questions.length) * 100);
      const record = saveExamResult(id, percent);
      if (percent >= PASS_PERCENT) onPassed?.();
      setResult({ percent, record });
      setPrev(readExamResult(id));
    }
  };

  if (!current && result) {
    return (
      <Results
        answers={answers}
        percent={result.percent}
        record={result.record}
        onRestart={start}
        renderWords={renderWords}
        actions={actions}
      />
    );
  }

  return (
    <div className={styles.exam}>
      <div className={styles.progress}>
        <ProgressBar value={index / questions.length} />
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>
      {current &&
        (current.type === 'write' ? (
          <WriteCard key={current.id} question={current} onSubmit={submit} />
        ) : (
          <ChoiceCard key={current.id} question={current} onSubmit={submit} />
        ))}
    </div>
  );
}

// ---------- задания ----------

function WriteCard({ question, onSubmit }: { question: WriteQuestion; onSubmit: (given: string, v: AnswerVerdict) => void }) {
  const [answer, setAnswer] = useState('');
  const [listens, setListens] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboard = useGreekKeyboard();

  useEffect(() => {
    if (keyboard.autoFocus) inputRef.current?.focus();
  }, [keyboard.autoFocus]);

  const listen = () => {
    if (!question.audio || listens >= MAX_LISTENS) return;
    setListens((n) => n + 1);
    void speak(question.audio);
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onSubmit(answer.trim(), compareAnswer(answer, question.accepted));
  };

  return (
    <div className={styles.card}>
      <div className={styles.label}>{question.label}</div>
      {question.audio ? (
        <div className={styles.listen}>
          <Button variant="secondary" onClick={listen} disabled={listens >= MAX_LISTENS}>
            <SpeakerIcon className={styles.icon} />
            {listens === 0 ? 'Прослушать' : listens < MAX_LISTENS ? 'Ещё раз (последний)' : 'Прослушано'}
          </Button>
          <span className={styles.listenHint}>
            Осталось прослушиваний: {MAX_LISTENS - listens}
          </span>
        </div>
      ) : (
        <div className={styles.prompt}>{question.prompt}</div>
      )}

      <form onSubmit={send} className={styles.form}>
        <input
          ref={inputRef}
          className={styles.input}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Напишите по-гречески…"
          lang="el"
          inputMode={keyboard.inputMode}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <Button type="submit" disabled={!answer.trim()} onMouseDown={(e) => e.preventDefault()}>
          Ответить
        </Button>
      </form>
      <GreekKeyboard
        open={keyboard.open}
        onToggle={keyboard.toggle}
        onKey={(ch) => setAnswer(answer + ch)}
        onBackspace={() => setAnswer(answer.slice(0, -1))}
      />
    </div>
  );
}

function ChoiceCard({ question, onSubmit }: { question: ChoiceQuestion; onSubmit: (given: string, v: AnswerVerdict) => void }) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>
        {question.label}
        {question.context && <> · «{question.context}»</>}
      </div>
      {question.passage && (
        <div className={styles.passage} lang="el">
          {question.passage.join(' ')}
        </div>
      )}
      <div className={styles.prompt} lang={question.greekPrompt ? 'el' : undefined}>
        {question.prompt}
      </div>
      <div className={styles.options}>
        {question.options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={styles.option}
            onClick={() => onSubmit(option, i === question.answer ? 'correct' : 'wrong')}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- итог ----------

function expectedOf(q: ExamQuestion): string {
  return q.type === 'write' ? (q.accepted[0] ?? '') : (q.options[q.answer] ?? '');
}

function promptOf(q: ExamQuestion): string {
  if (q.type === 'choice') return q.prompt;
  return q.audio ? `Диктант${q.russian ? ` (${q.russian})` : ''}` : (q.prompt ?? '');
}

interface ResultsProps {
  answers: Answer[];
  percent: number;
  record: boolean;
  onRestart: () => void;
  renderWords?: Props['renderWords'];
  actions?: ReactNode;
}

function Results({ answers, percent, record, onRestart, renderWords, actions }: ResultsProps) {
  const passed = percent >= PASS_PERCENT;
  const mistakes = answers.filter((a) => a.verdict !== 'correct');
  const correct = answers.length - mistakes.length;
  const words = [
    ...new Map(mistakes.flatMap((a) => (a.question.word ? [[a.question.word.greek, a.question.word]] : []))).values(),
  ];

  return (
    <div className={styles.exam}>
      <div className={`${styles.card} ${passed ? styles.passed : styles.failed}`}>
        {passed ? (
          <Wreath className={styles.wreath}>
            <span className={styles.score}>{percent}%</span>
          </Wreath>
        ) : (
          <div className={styles.score}>{percent}%</div>
        )}
        <div className={styles.verdict}>
          {passed ? 'Экзамен сдан!' : `Пока не сдан — нужно ${PASS_PERCENT}%`}
        </div>
        <div className={styles.summary}>
          Верно {correct} из {answers.length}.{record && ' Это ваш лучший результат.'}
        </div>
        <div className={styles.actions}>
          <Button variant={passed ? 'secondary' : 'primary'} onClick={onRestart}>
            Пройти ещё раз
          </Button>
          {actions}
        </div>
      </div>

      {mistakes.length > 0 && (
        <section className={styles.review}>
          <h2 className={styles.reviewTitle}>Разбор ошибок</h2>
          {words.length > 0 && renderWords && <div className={styles.words}>{renderWords(words)}</div>}
          <ol className={styles.mistakes}>
            {mistakes.map(({ question, given, verdict }) => {
              const expected = expectedOf(question);
              const greek = question.type === 'write' || question.greekPrompt;
              return (
                <li key={question.id} className={styles.mistake}>
                  <div className={styles.label}>{question.label}</div>
                  <div className={styles.mistakePrompt} lang={question.type === 'choice' && question.greekPrompt ? 'el' : undefined}>
                    {promptOf(question)}
                    {question.type === 'choice' && question.speak && <SpeakButton text={question.speak} />}
                  </div>
                  <div className={styles.given}>
                    Ваш ответ: <span lang={question.type === 'write' ? 'el' : undefined}>{given}</span>
                    {verdict === 'accent' && <span className={styles.accent}> — ошибка в ударении</span>}
                  </div>
                  <div className={styles.right}>
                    Верно: <span lang={greek && question.type === 'write' ? 'el' : undefined}>{expected}</span>
                    {question.type === 'write' && <SpeakButton text={expected} />}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

