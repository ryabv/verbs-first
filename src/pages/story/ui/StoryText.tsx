import { useEffect, useRef, useState } from 'react';
import type { StoryChapter, StoryStep } from '@/entities/story';
import type { TextToken } from '@/entities/verb';
import { Phrase } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { gapIndex, inFragment, tokenId } from '../lib/task';
import { storyDeck, STORY_DECK } from '../lib/deck';
import styles from './Story.module.css';

interface Props {
  chapter: StoryChapter;
  step: StoryStep;
  /** Пройденные шаги главы: их пропуски заполнены, реплики на слух открыты. */
  done: readonly string[];
  /** Задача текущего шага решена (или показан ответ). */
  solved: boolean;
  /** Режим «нажмите слова»: выбранные токены и переключатель. */
  tap?: { picked: ReadonlySet<string>; toggle: (id: string, text: string) => void; verdict?: ReadonlyMap<string, boolean> };
}

/** Предложение — реплика задания на слух (его audio): прячем до ответа, иначе ответ виден в тексте. */
const listensTo = (s: StoryStep, greek: string) => s.task?.kind === 'choose' && s.task.audio === greek;

/**
 * Правая панель: вся глава, текущий кусок подсвечен и в фокусе. Чтобы целый текст не выдавал ответы,
 * пропуски ещё не пройденных шагов пустые, а реплики заданий на слух размыты до ответа.
 */
export function StoryText({ chapter, step, done, solved, tap }: Props) {
  const currentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [from, to] = step.sentences;

  // Компонент пересоздаётся на каждом шаге (key у страницы) — прокручиваем к куску при появлении.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  /** Шаг открыт: текущий — если решён, остальные — если пройдены. */
  const isOpen = (s: StoryStep) => (s.id === step.id ? solved : done.includes(s.id));

  /** Пропуск какого шага это слово (и открыт ли он). */
  const gapOf = (n: number, token: TextToken) => {
    for (const s of chapter.steps) {
      const g = gapIndex(s, n, token);
      if (g >= 0) return { owner: s, index: g, open: isOpen(s) };
    }
    return undefined;
  };

  /** Шаг, до ответа на который реплика спрятана (номер шага с 1), или 0. */
  const hiddenUntil = (n: number) => {
    const i = chapter.steps.findIndex((s) => listensTo(s, chapter.sentences[n - 1]!.greek) && !isOpen(s));
    return i + 1;
  };

  const renderToken = (n: number) => (token: TextToken, i: number) => {
    const gap = gapOf(n, token);
    const current = gap?.owner.id === step.id;
    if (gap && !gap.open) {
      const multi = current && step.task?.kind === 'gap' && step.task.gaps.length > 1;
      return (
        <span className={current ? styles.gap : `${styles.gap} ${styles.gapLater}`} aria-label={current ? `Пропуск ${gap.index + 1}` : 'Пропуск'}>
          {multi ? gap.index + 1 : '…'}
        </span>
      );
    }
    if (gap && current) return <span className={styles.filled}>{token.text}</span>;
    if (!tap || !inFragment(step, n)) return undefined;
    const id = tokenId(n, i);
    const verdict = tap.verdict?.get(id);
    const cls = [styles.tapWord, tap.picked.has(id) && styles.tapPicked, verdict === true && styles.tapRight, verdict === false && styles.tapWrong]
      .filter(Boolean)
      .join(' ');
    return (
      <button type="button" className={cls} aria-pressed={tap.picked.has(id)} onClick={() => tap.toggle(id, token.text)}>
        {token.text}
      </button>
    );
  };

  const render = (n: number) => {
    const s = chapter.sentences[n - 1]!;
    const hidden = hiddenUntil(n);
    if (hidden) {
      return (
        <p key={n} className={`${styles.sentence} ${styles.hiddenLine}`}>
          {inFragment(step, n)
            ? 'Эту реплику сначала прослушайте — текст появится после ответа.'
            : `Реплика спрятана до задания на слух (шаг ${hidden}).`}
        </p>
      );
    }
    const hasOpenGap = chapter.steps.some((st) => st.task?.kind === 'gap' && !isOpen(st) && st.task.gaps.some((g) => g.sentence === n));
    return (
      <p key={n} className={styles.sentence}>
        <Phrase greek={s.greek} russian={s.russian} deck={STORY_DECK} wordDeck={storyDeck} renderToken={renderToken(n)} />
        {!hasOpenGap && <SpeakButton text={s.greek} />}
      </p>
    );
  };

  const numbers = chapter.sentences.map((_, i) => i + 1);
  const before = numbers.filter((n) => n < from);
  const current = numbers.filter((n) => n >= from && n <= to);
  const after = numbers.filter((n) => n > to);

  return (
    <div className={expanded ? `${styles.text} ${styles.textExpanded}` : styles.text}>
      <button type="button" className={styles.expand} onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Только текущий кусок' : 'Весь текст главы'}
      </button>
      {before.length > 0 && <div className={styles.outside}>{before.map(render)}</div>}
      <div className={styles.current} ref={currentRef}>
        {current.map(render)}
      </div>
      {after.length > 0 && <div className={styles.outside}>{after.map(render)}</div>}
    </div>
  );
}
