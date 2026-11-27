import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { daysUntil, isLearned, nextReview, pickPractice, pickSession, planToday, streakOf, useCards, type Card, type Stage } from '@/entities/card';
import { STORY_PRAISE } from '@/entities/story';
import { SpeakButton } from '@/features/pronounce';
import { plural } from '@/shared/lib/plural';
import { Button } from '@/shared/ui/button';
import { Check } from '@/shared/ui/ornament';
import { ProgressBar } from '@/shared/ui/progress-bar';
import type { SentenceSource } from '../model/sentences';
import { useSession, type Growth } from '../model/useSession';
import { CardQuestion } from './CardQuestion';
import styles from './CardTrainer.module.css';

interface Props {
  /** Карточки, которые тренируем (все или один набор). */
  pool: readonly Card[];
  /** Все карточки — для вариантов ответа, если в наборе мало слов. */
  allCards: readonly Card[];
  /** Фразы со словом — из глав (widgets/word-sentences). */
  sentences: SentenceSource;
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

/** Метка сессии в истории браузера: «назад» (стрелка, жест, кнопка телефона) закрывает сессию, а не уводит со страницы. */
interface SessionState {
  cardSession?: number;
}

/**
 * Тренировка: план на сегодня → сессия → итог. Режима не выбираем: как спросить слово, решает его прочность
 * (знакомство → узнать → вспомнить → написать, docs/product/cards.md).
 */
export function CardTrainer({ pool, allCards, sentences, onSessionChange }: Props) {
  const [session, setSession] = useState<{ id: number; ids: string[] } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  // Сессия идёт, пока в истории стоит её запись; «назад» снимает запись — и сессия закрывается.
  const active = session !== null && (location.state as SessionState | null)?.cardSession === session.id;
  useEffect(() => onSessionChange?.(active), [active, onSessionChange]);
  const plan = planToday(pool);
  const next = nextReview(pool);
  const planned = pickSession(pool).length;

  const start = (list: Card[]) => {
    const id = (session?.id ?? 0) + 1;
    setSession({ id, ids: list.map((c) => c.id) });
    // Первая сессия — новая запись в истории; «Ещё сессия» — на её месте.
    navigate(location, { state: { cardSession: id } satisfies SessionState, replace: active });
  };
  const exit = () => navigate(-1);

  if (session && active) {
    return (
      <Session
        key={session.id}
        ids={session.ids}
        allCards={allCards}
        sentences={sentences}
        onExit={exit}
        onMore={planned > 0 ? () => start(pickSession(pool)) : undefined}
        pool={pool}
      />
    );
  }

  const nothing = planned === 0;
  const started = pool.some((c) => c.srs);
  const fresh = Math.min(plan.fresh.length, Math.max(0, planned - plan.due.length));

  return (
    <div className={styles.today}>
      <div className={styles.plan}>
        {nothing ? (
          <div>
            <div className={styles.planDone}>На сегодня всё!</div>
            <p className={styles.planNote}>
              {next
                ? `Следующее повторение — ${whenText(next.at)}: ${next.count} ${words(next.count)}. Слова возвращаются, когда начинают забываться, — так они запоминаются надолго.`
                : 'Дочитайте главу — её слова появятся здесь.'}
            </p>
          </div>
        ) : (
          <div className={styles.planNumbers}>
            <div className={styles.planNum}>
              <b>{plan.due.length}</b>
              <span>повторить</span>
            </div>
            <div className={styles.planNum}>
              <b>{fresh}</b>
              <span>новых</span>
              {plan.freshTotal > fresh && <small>ещё {plan.freshTotal - fresh} ждут</small>}
            </div>
          </div>
        )}
        <div className={styles.planActions}>
          {!nothing && <Button onClick={() => start(pickSession(pool))}>Начать: {planned} {cards(planned)}</Button>}
          {nothing && started && (
            <Button variant="secondary" onClick={() => start(pickPractice(pool))}>
              Потренироваться ещё
            </Button>
          )}
        </div>
      </div>
      <p className={styles.planNote}>
        Новое слово сначала просто знакомится с вами — с примерами из глав. Потом его нужно узнать во фразе, позже —
        вспомнить в пропуске, а то, что держится давно, — написать. Фразы каждый раз другие.
      </p>
    </div>
  );
}

interface SessionProps {
  ids: string[];
  allCards: readonly Card[];
  pool: readonly Card[];
  sentences: SentenceSource;
  onExit: () => void;
  /** Ещё сессия (если в плане что-то осталось). */
  onMore?: () => void;
}

function Session({ ids, allCards, pool, sentences, onExit, onMore }: SessionProps) {
  const session = useSession(ids, allCards);

  return (
    <div className={styles.session}>
      <div className={styles.progress}>
        <ProgressBar value={session.done / session.total} />
        <span>
          {session.done} / {session.total}
        </span>
      </div>

      {session.current ? (
        <CardQuestion
          key={`${session.current.id}-${session.attempt}`}
          card={session.current}
          sentences={sentences}
          allCards={allCards}
          onMeet={session.onMeet}
          onAnswer={session.onAnswer}
          onNext={session.onNext}
        />
      ) : (
        <Finish firstTry={session.firstTry} total={session.total} growth={session.growth} missed={session.missed} pool={pool} onMore={onMore} onExit={onExit} />
      )}
    </div>
  );
}

interface FinishProps {
  firstTry: number;
  total: number;
  growth: Growth;
  missed: readonly Card[];
  pool: readonly Card[];
  onMore?: () => void;
  onExit: () => void;
}

const STAGE_NAMES: Record<Stage, string> = { intro: 'знакомство', recognize: 'узнать', recall: 'вспомнить', write: 'написать' };
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Ближайшая цель набора: половина, потом весь. */
function milestone(learned: number, total: number): string | null {
  if (total === 0) return null;
  if (learned >= total) return 'Весь набор выучен.';
  const half = Math.ceil(total / 2);
  const left = (learned < half ? half : total) - learned;
  return learned < half ? `Ещё ${left} ${words(left)} — и половина набора выучена.` : `Ещё ${left} ${words(left)} — и весь набор выучен.`;
}

/**
 * Итог сессии — тепло, но без фанфар (решение владельца, 2026-11-27): «Μπράβο!», три числа, слова, которые выросли,
 * ближайшая цель набора и неделя занятий. Ошибки — спокойно: эти слова вернутся первыми.
 */
export function Finish({ firstTry, total, growth, missed, pool, onMore, onExit }: FinishProps) {
  const { days } = useCards();
  const next = nextReview(pool);
  const streak = streakOf(days);
  const learned = pool.filter(isLearned).length;
  const goal = milestone(learned, pool.length);
  const clean = firstTry === total;
  // Неделя: последние 7 дней, занимались ли. «Сегодня» фиксируется при показе итога.
  const [now] = useState(() => Date.now());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6 + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { key, label: WEEKDAYS[d.getDay()]!, done: days.includes(key), today: i === 6 };
  });
  const grown = [
    ...growth.learned.map((c) => ({ card: c, note: 'выучено' })),
    ...growth.stronger.map(({ card, stage }) => ({ card, note: `дальше — ${STAGE_NAMES[stage]}` })),
    ...growth.met.map((c) => ({ card: c, note: 'новое' })),
  ];

  return (
    <div className={styles.finish}>
      <div className={styles.praise}>
        <span lang="el" className={styles.praiseGreek}>
          {STORY_PRAISE.greek}
        </span>
        <SpeakButton text={STORY_PRAISE.greek} />
        <span className={styles.praiseRu}>{clean ? 'Все — с первого раза.' : 'Сессия закончена.'}</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <b>
            {firstTry}
            <small>/{total}</small>
          </b>
          <span>с первого раза</span>
        </div>
        <div className={styles.stat}>
          <b>{growth.met.length}</b>
          <span>новых слов</span>
        </div>
        <div className={styles.stat}>
          <b>{growth.learned.length > 0 ? `+${growth.learned.length}` : learned}</b>
          <span>{growth.learned.length > 0 ? 'выучено' : 'выучено всего'}</span>
        </div>
      </div>

      {grown.length > 0 && (
        <>
          <div className={styles.finishLabel}>Выросли</div>
          <ul className={styles.grown}>
            {grown.map(({ card, note }) => (
              <li key={card.id}>
                <span lang="el" className={styles.grownGreek}>
                  {card.greek}
                </span>
                <span className={styles.grownNote}>{note}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.growthBar}>
        <ProgressBar value={pool.length ? learned / pool.length : 0} thin />
        <span>
          выучено {learned} из {pool.length}
        </span>
      </div>
      {goal && <p className={styles.goal}>{goal}</p>}

      <div className={styles.week} aria-label={`Занимаетесь ${streak} ${plural(streak, ['день', 'дня', 'дней'])} подряд`}>
        {week.map((d) => (
          <span key={d.key} className={[styles.day, d.done && styles.dayDone, d.today && styles.dayToday].filter(Boolean).join(' ')}>
            <span className={styles.dayDot}>{d.done && <Check />}</span>
            {d.label}
          </span>
        ))}
        <span className={styles.weekText}>
          {streak > 1 ? `${streak} ${plural(streak, ['день', 'дня', 'дней'])} подряд` : 'Завтра — второй день подряд'}
          {next && <>. Дальше — {whenText(next.at)}</>}
        </span>
      </div>

      {missed.length > 0 && (
        <>
          <div className={styles.finishLabel}>Вернутся первыми — с ними была ошибка</div>
          <ul className={styles.missed}>
            {missed.map((c) => (
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
  );
}
