import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { sentenceGaps, STORY_END, withGaps, type StoryChapter, type StoryStep } from '@/entities/story';
import type { TextToken } from '@/entities/verb';
import { Phrase } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Laurel } from '@/shared/ui/ornament';
import { gapIndex, inFragment, tokenId } from '../lib/task';
import { storyDeck, STORY_DECK } from '../lib/deck';
import { ChapterTitle } from './ChapterTitle';
import { TranslateButton } from './TranslateButton';
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

/** Клик пришёлся на что-то своё (слово, кнопку, окно слова) или это выделение текста — не переход. */
const ownClick = (e: MouseEvent) =>
  (e.target as Element).closest('button, a, input, [data-popover]') !== null || Boolean(window.getSelection()?.toString());

/**
 * Правая панель: вся глава, текущий кусок подсвечен и в фокусе. Текст поделён на куски по шагам:
 * номер шага стоит на полях куска, нажатие на другой кусок открывает его шаг. Чтобы целый текст не выдавал ответы,
 * пропуски ещё не пройденных шагов пустые, а реплики заданий на слух размыты до ответа.
 */
export function StoryText({ chapter, step, done, solved, tap }: Props) {
  const navigate = useNavigate();
  const currentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  // Предложения, у которых открыт перевод.
  const [translated, setTranslated] = useState<ReadonlySet<number>>(() => new Set());
  const toggleTranslation = (n: number) =>
    setTranslated((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  // Компонент пересоздаётся на каждом шаге (key у страницы). Страница при переходе между шагами
  // не прокручивается наверх (preventScrollReset), поэтому двигаем её, только если кусок не виден целиком.
  useEffect(() => {
    const el = currentRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    if (r.top < Math.max(top, 0) || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
    // Заполненный пропуск и слова после ответа — обычные слова с переводом (подсветка — в tokenClass).
    if (gap && current) return undefined;
    if (!tap || solved || !inFragment(step, n)) return undefined;
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

  /** Подсветка после ответа: заполненный пропуск, верно/лишнее в «нажмите слова». */
  const tokenClass = (n: number) => (token: TextToken, i: number) => {
    const gap = gapOf(n, token);
    if (gap && gap.owner.id === step.id) return styles.filled;
    if (!tap || !solved || !inFragment(step, n)) return undefined;
    const verdict = tap.verdict?.get(tokenId(n, i));
    if (verdict === true) return styles.tapRight;
    if (verdict === false) return styles.tapWrong;
    return undefined;
  };

  /** lead — номер шага на полях, перед первым предложением куска (как номер стиха в книге). */
  const render = (n: number, lead?: ReactNode) => {
    const s = chapter.sentences[n - 1]!;
    const hidden = hiddenUntil(n);
    if (hidden) {
      return (
        <p key={n} className={`${styles.sentence} ${styles.hiddenLine}`}>
          {lead}
          {inFragment(step, n)
            ? 'Эту реплику сначала прослушайте — текст появится после ответа.'
            : `Реплика спрятана до задания на слух (шаг ${hidden}).`}
        </p>
      );
    }
    // Нерешённые пропуски озвучка пропускает (пауза вместо слова) — звук не выдаёт ответ.
    const openGaps = sentenceGaps(chapter, n).filter((g) => !isOpen(g.step));
    const shown = translated.has(n);
    const after = (
      <>
        <SpeakButton text={withGaps(s.greek, openGaps.map((g) => g.word))} />
        <TranslateButton shown={shown} onToggle={() => toggleTranslation(n)} />
      </>
    );
    return (
      <p key={n} className={styles.sentence}>
        {lead}
        <Phrase
          greek={s.greek}
          russian={s.russian}
          deck={STORY_DECK}
          wordDeck={storyDeck}
          renderToken={renderToken(n)}
          tokenClass={tokenClass(n)}
          after={after}
        />
        {shown && <span className={styles.translation}>{s.russian}</span>}
      </p>
    );
  };

  /** Номера предложений → шаг, к которому они относятся (кусок текста). */
  const numbers = chapter.sentences.map((_, i) => i + 1);
  const ownerOf = (n: number) => chapter.steps.findIndex((s) => n >= s.sentences[0] && n <= s.sentences[1]);
  const groups: { index: number; sentences: number[] }[] = [];
  for (const n of numbers) {
    const index = ownerOf(n);
    const last = groups.at(-1);
    if (last && last.index === index) last.sentences.push(n);
    else groups.push({ index, sentences: [n] });
  }
  const currentIndex = chapter.steps.findIndex((s) => s.id === step.id);

  const renderGroup = ({ index, sentences }: { index: number; sentences: number[] }) => {
    const owner = chapter.steps[index];
    if (!owner) return <div key={`free-${sentences[0]}`} className={styles.outside}>{sentences.map((n) => render(n))}</div>;
    const isCurrent = index === currentIndex;
    // Номер книжным шрифтом; пройденный — в лавровом венке (как медальоны уроков), текущий — терракотовый.
    const isDone = done.includes(owner.id) || (isCurrent && solved && Boolean(owner.task));
    const mark = [styles.stepMark, isDone && styles.stepMarkDone, isCurrent && styles.stepMarkCurrent].filter(Boolean).join(' ');
    const status = isDone ? 'пройден' : owner.task ? 'задание не сделано' : 'не прочитан';
    const title = `Шаг ${index + 1}. ${owner.title} — ${status}`;
    const face = (
      <>
        {isDone && <Laurel className={styles.stepLaurel} size="100%" aria-hidden />}
        <span className={styles.markNum}>{index + 1}</span>
      </>
    );
    const marker = isCurrent ? (
      <span className={mark} title={title} aria-label={title} aria-current="step">
        {face}
      </span>
    ) : (
      <Link className={mark} to={routes.storyStep(chapter.id, index + 1)} title={title} aria-label={title} preventScrollReset>
        {face}
      </Link>
    );
    if (isCurrent) {
      return (
        <div key={owner.id} className={styles.current} ref={currentRef}>
          {sentences.map((n, k) => render(n, k === 0 && marker))}
        </div>
      );
    }
    const go = (e: MouseEvent) => !ownClick(e) && navigate(routes.storyStep(chapter.id, index + 1), { preventScrollReset: true });
    return (
      // Клик по куску — удобство для мыши и пальца; ссылка для клавиатуры и чтения с экрана — номер на полях.
      <div key={owner.id} role="presentation" className={`${styles.outside} ${styles.fragment}`} onClick={go} title={title}>
        {sentences.map((n, k) => render(n, k === 0 && marker))}
      </div>
    );
  };

  return (
    <div className={expanded ? `${styles.text} ${styles.textExpanded}` : styles.text}>
      <button type="button" className={styles.expand} onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Только текущий кусок' : 'Весь текст главы'}
      </button>
      <ChapterTitle chapter={chapter} />
      {groups.map(renderGroup)}
      <Link to={routes.storyStep(chapter.id, 'end')} className={done.includes(STORY_END) ? `${styles.toEnd} ${styles.toEndDone}` : styles.toEnd}>
        ✦ Вся глава и конспект
      </Link>
    </div>
  );
}
