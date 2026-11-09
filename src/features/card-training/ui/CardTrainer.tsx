import { useMemo, useState } from 'react';
import { pickSession, statusOf, type Card } from '@/entities/card';
import { Button } from '@/shared/ui/button';
import {
  ANSWER_LABELS,
  directionOf,
  PROMPT_LABELS,
  readSettings,
  writeSettings,
  type AnswerMode,
  type Prompt,
  type TrainingSettings,
} from '../model/settings';
import { useSession } from '../model/useSession';
import { CardQuestion } from './CardQuestion';
import { Amphora } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import styles from './CardTrainer.module.css';

interface Props {
  /** Карточки выбранных наборов. */
  pool: readonly Card[];
  /** Все карточки — для вариантов ответа, если в наборе мало слов. */
  allCards: readonly Card[];
}

const PROMPTS = Object.keys(PROMPT_LABELS) as Prompt[];
const ANSWERS = Object.keys(ANSWER_LABELS) as AnswerMode[];

/** Тренажёр карточек: настройка → сессия → итог. */
export function CardTrainer({ pool, allCards }: Props) {
  const [settings, setSettingsState] = useState<TrainingSettings>(readSettings);
  const [session, setSession] = useState<{ id: number; cards: Card[] } | null>(null);
  const dir = directionOf(settings);

  const setSettings = (next: TrainingSettings) => {
    setSettingsState(next);
    writeSettings(next);
  };

  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, learned: 0 };
    for (const card of pool) c[statusOf(card, dir)]++;
    return c;
  }, [pool, dir]);
  const planned = Math.min(pool.length, 20);

  if (session) {
    return (
      <Session
        key={session.id}
        cards={session.cards}
        allCards={allCards}
        settings={settings}
        onExit={() => setSession(null)}
        onRestart={() => setSession({ id: session.id + 1, cards: pickSession(pool, dir) })}
      />
    );
  }

  if (pool.length === 0) {
    return (
      <p className={styles.empty}>
        <Amphora className={styles.emptyIcon} size="2.5rem" />
        В выбранных наборах пока нет карточек. Добавьте слова из уроков или свои.
      </p>
    );
  }

  return (
    <div className={styles.setup}>
      <div className={styles.option}>
        <span className={styles.optionLabel}>Показываем</span>
        <div className={styles.segmented}>
          {PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={settings.prompt === p}
              className={settings.prompt === p ? styles.segActive : styles.seg}
              onClick={() => setSettings({ ...settings, prompt: p })}
            >
              {PROMPT_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.option}>
        <span className={styles.optionLabel}>Отвечаем</span>
        <div className={styles.segmented}>
          {ANSWERS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={settings.answer === a}
              className={settings.answer === a ? styles.segActive : styles.seg}
              onClick={() => setSettings({ ...settings, answer: a })}
            >
              {ANSWER_LABELS[a]}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.direction}>
        {dir === 'ru-gr'
          ? 'Тренируем: вспомнить греческое слово'
          : 'Тренируем: понять греческое слово'}{' '}
        · новых {counts.new} · учатся {counts.learning} · выучено {counts.learned}
      </p>

      <div className={styles.start}>
        <Button onClick={() => setSession({ id: 1, cards: pickSession(pool, dir) })}>
          Начать: {planned} {plural(planned)}
        </Button>
      </div>
    </div>
  );
}

function plural(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'карточка';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'карточки';
  return 'карточек';
}

interface SessionProps {
  cards: Card[];
  allCards: readonly Card[];
  settings: TrainingSettings;
  onExit: () => void;
  onRestart: () => void;
}

function Session({ cards, allCards, settings, onExit, onRestart }: SessionProps) {
  const session = useSession(cards, directionOf(settings));

  return (
    <div className={styles.session}>
      <div className={styles.progress}>
        <ProgressBar value={session.done / session.total} />
        <span>
          {session.done} / {session.total}
        </span>
        <button type="button" className={styles.exit} onClick={onExit}>
          Закончить
        </button>
      </div>

      {session.current ? (
        <CardQuestion
          key={`${session.current.id}-${session.attempt}`}
          card={session.current}
          pool={cards}
          allCards={allCards}
          settings={settings}
          onResult={session.resolve}
        />
      ) : (
        <div className={styles.finish}>
          <div className={styles.finishTitle}>Сессия закончена!</div>
          <p>
            С первого раза: {session.firstTry} из {session.total}. Слова с ошибками попадут в следующую сессию
            первыми.
          </p>
          <div className={styles.start}>
            <Button onClick={onRestart}>Ещё сессия</Button>
            <Button variant="secondary" onClick={onExit}>
              К настройкам
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
