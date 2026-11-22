import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { type StoryChapter, type StoryStep } from '@/entities/story';
import { Phrase } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Laurel } from '@/shared/ui/ornament';
import { inFragment } from '../lib/task';
import { storyDeck, STORY_DECK } from '../lib/deck';
import { ChapterTitle } from './ChapterTitle';
import { TranslateButton } from './TranslateButton';
import styles from './Story.module.css';

interface Props {
  chapter: StoryChapter;
  step: StoryStep;
  /** Прочитанные шаги главы. */
  done: readonly string[];
  /** Вопрос текущего шага отвечен: реплика вопроса на слух открыта. */
  answered: boolean;
}

/** Предложение — реплика вопроса на слух (его audio): прячем до ответа, иначе ответ виден в тексте. */
const listensTo = (s: StoryStep, greek: string) => s.check?.audio === greek;

/** Клик пришёлся на что-то своё (слово, кнопку, окно слова) или это выделение текста — не переход. */
const ownClick = (e: MouseEvent) =>
  (e.target as Element).closest('button, a, input, [data-popover]') !== null || Boolean(window.getSelection()?.toString());

/**
 * Правая панель: вся глава, текущий кусок подсвечен и в фокусе. Текст поделён на куски по шагам:
 * номер шага стоит на полях куска, нажатие на другой кусок открывает его шаг. Текст целый, без пропусков;
 * спрятана только реплика вопроса на слух — до ответа.
 */
export function StoryText({ chapter, step, done, answered }: Props) {
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

  /** Вопрос шага отвечен: текущий — сейчас, остальные — если шаг прочитан. */
  const isOpen = (s: StoryStep) => (s.id === step.id ? answered : done.includes(s.id));

  /** Шаг, до ответа на который реплика спрятана (номер шага с 1), или 0. */
  const hiddenUntil = (n: number) => {
    const i = chapter.steps.findIndex((s) => listensTo(s, chapter.sentences[n - 1]!.greek) && !isOpen(s));
    return i + 1;
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
            : `Реплика спрятана до вопроса на слух (шаг ${hidden}).`}
        </p>
      );
    }
    const shown = translated.has(n);
    const after = (
      <span className={styles.lineTools}>
        <SpeakButton text={s.greek} />
        <TranslateButton shown={shown} onToggle={() => toggleTranslation(n)} />
      </span>
    );
    return (
      <p key={n} className={styles.sentence}>
        {lead}
        <Phrase
          greek={s.greek}
          russian={s.russian}
          deck={STORY_DECK}
          wordDeck={storyDeck}
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
    const isDone = done.includes(owner.id);
    const mark = [styles.stepMark, isDone && styles.stepMarkDone, isCurrent && styles.stepMarkCurrent].filter(Boolean).join(' ');
    const status = isDone ? 'прочитан' : 'не прочитан';
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
    </div>
  );
}
