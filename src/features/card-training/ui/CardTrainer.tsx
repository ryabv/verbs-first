import { useState } from 'react';
import { daysUntil, nextReview, pickPractice, pickSession, planToday, type Card } from '@/entities/card';
import { SpeakButton } from '@/features/pronounce';
import { plural } from '@/shared/lib/plural';
import { Button } from '@/shared/ui/button';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { directionOf, MODE_IDS, MODES, readMode, writeMode, type Mode } from '../model/settings';
import { useSession } from '../model/useSession';
import { CardQuestion } from './CardQuestion';
import styles from './CardTrainer.module.css';

interface Props {
  /** Карточки, которые тренируем (все или один набор). */
  pool: readonly Card[];
  /** Все карточки — для вариантов ответа, если в наборе мало слов. */
  allCards: readonly Card[];
  /** Идёт сессия: странице стоит спрятать остальное, чтобы ничто не отвлекало. */
  onSessionChange?: (active: boolean) => void;
}

const cards = (n: number) => plural(n, ['карточка', 'карточки', 'карточек']);
const words = (n: number) => plural(n, ['слово', 'слова', 'слов']);

/** «завтра», «через 3 дня», «сегодня позже». */
export function whenText(at: number): string {
  const d = daysUntil(at);
  if (d <= 0) return 'сегодня';
  if (d === 1) return 'завтра';
  if (d === 2) return 'послезавтра';
  return `через ${d} ${plural(d, ['день', 'дня', 'дней'])}`;
}

/** Тренировка: план на сегодня → сессия → итог. */
export function CardTrainer({ pool, allCards, onSessionChange }: Props) {
  const [mode, setModeState] = useState<Mode>(readMode);
  const [session, setSession] = useState<{ id: number; cards: Card[] } | null>(null);
  const settings = MODES[mode].settings;
  const dir = directionOf(settings);
  const plan = planToday(pool, dir);
  const next = nextReview(pool, dir);
  const planned = pickSession(pool, dir).length;

  const setMode = (m: Mode) => {
    setModeState(m);
    writeMode(m);
  };
  const start = (list: Card[]) => {
    setSession((s) => ({ id: (s?.id ?? 0) + 1, cards: list }));
    onSessionChange?.(true);
  };
  const exit = () => {
    setSession(null);
    onSessionChange?.(false);
  };

  if (session) {
    return (
      <Session
        key={session.id}
        cards={session.cards}
        allCards={allCards}
        mode={mode}
        onExit={exit}
        onMore={planned > 0 ? () => start(pickSession(pool, dir)) : undefined}
        pool={pool}
      />
    );
  }

  const nothing = planned === 0;
  const started = pool.some((c) => c.progress[dir].seen > 0);

  return (
    <div className={styles.today}>
      <fieldset className={styles.modes}>
        <legend className={styles.modesLegend}>Как тренируемся</legend>
        {MODE_IDS.map((m) => (
          <label key={m} className={mode === m ? `${styles.mode} ${styles.modeActive}` : styles.mode}>
            <input type="radio" name="card-mode" className={styles.modeInput} checked={mode === m} onChange={() => setMode(m)} />
            <span className={styles.modeTitle}>{MODES[m].title}</span>
            <span className={styles.modeText}>{MODES[m].text}</span>
          </label>
        ))}
      </fieldset>
      <p className={styles.modeHint}>{MODES[mode].text}</p>

      <div className={styles.plan}>
        {nothing ? (
          <div>
            <div className={styles.planDone}>На сегодня всё!</div>
            <p className={styles.planNote}>
              {next
                ? `Следующее повторение — ${whenText(next.at)}: ${next.count} ${words(next.count)}. Слова возвращаются, когда начинают забываться, — так они запоминаются надолго.`
                : 'Добавьте слова из уроков — и они появятся здесь.'}
            </p>
          </div>
        ) : (
          <div className={styles.planNumbers}>
            <div className={styles.planNum}>
              <b>{plan.due.length}</b>
              <span>повторить</span>
            </div>
            <div className={styles.planNum}>
              <b>{Math.min(plan.fresh.length, Math.max(0, planned - plan.due.length))}</b>
              <span>новых</span>
              {plan.freshTotal > plan.fresh.length && <small>ещё {plan.freshTotal - plan.fresh.length} ждут</small>}
            </div>
          </div>
        )}
        <div className={styles.planActions}>
          {!nothing && <Button onClick={() => start(pickSession(pool, dir))}>Начать: {planned} {cards(planned)}</Button>}
          {nothing && started && (
            <Button variant="secondary" onClick={() => start(pickPractice(pool, dir))}>
              Потренироваться ещё
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SessionProps {
  cards: Card[];
  allCards: readonly Card[];
  pool: readonly Card[];
  mode: Mode;
  onExit: () => void;
  /** Ещё сессия (если в плане что-то осталось). */
  onMore?: () => void;
}

function Session({ cards: list, allCards, pool, mode, onExit, onMore }: SessionProps) {
  const settings = MODES[mode].settings;
  const dir = directionOf(settings);
  const session = useSession(list, dir);
  const next = session.finished ? nextReview(pool, dir) : null;

  return (
    <div className={styles.session}>
      <div className={styles.progress}>
        <ProgressBar value={session.done / session.total} />
        <span>
          {session.done} / {session.total}
        </span>
        {!session.finished && (
          <button type="button" className={styles.exit} onClick={onExit}>
            Закончить
          </button>
        )}
      </div>

      {session.current ? (
        <CardQuestion
          key={`${session.current.id}-${session.attempt}`}
          card={session.current}
          pool={list}
          allCards={allCards}
          settings={settings}
          onResult={session.resolve}
        />
      ) : (
        <div className={styles.finish}>
          <div className={styles.finishTitle}>Сессия закончена!</div>
          <p className={styles.finishStats}>
            С первого раза — {session.firstTry} из {session.total}.
            {next && ` Следующее повторение — ${whenText(next.at)}.`}
          </p>
          {session.missed.length > 0 && (
            <>
              <div className={styles.finishLabel}>Где ошиблись — вернутся первыми:</div>
              <ul className={styles.missed}>
                {session.missed.map((c) => (
                  <li key={c.id}>
                    <span lang="el" className={styles.missedGreek}>
                      {c.greek}
                    </span>
                    <SpeakButton text={c.greek} />
                    <span className={styles.missedRussian}>{c.russian}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className={styles.finishActions}>
            {onMore && <Button onClick={onMore}>Ещё сессия</Button>}
            <Button variant={onMore ? 'secondary' : 'primary'} onClick={onExit}>
              Готово
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
