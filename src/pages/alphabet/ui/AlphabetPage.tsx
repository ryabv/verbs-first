import { useCallback, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { COMBINATIONS, CombinationList, LETTERS, LetterGrid, READING_COURSE, SOUND_QUIZ, WORD_QUIZ } from '@/entities/alphabet';
import { lessonBranches, lessonStages } from '@/entities/lesson';
import { AlphabetOrder, ChoiceQuiz } from '@/features/alphabet-quiz';
import { wordIn } from '@/features/card-add';
import { progressKey } from '@/features/lesson-progress';
import { SpeakButton } from '@/features/pronounce';
import { LessonMap } from '@/widgets/lesson-map';
import { LessonPath } from '@/widgets/lesson-path';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { Arrow } from '@/shared/ui/ornament';
import { PrevNext } from '@/shared/ui/prev-next';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import { ALPHABET_DECK, ReadingStep } from './ReadingStep';
import { StressRules } from './StressRules';
import styles from './AlphabetPage.module.css';

const COURSE = READING_COURSE;
const STAGES = lessonStages(COURSE);
const BRANCHES = lessonBranches(COURSE);
const CRUMBS: Crumb[] = [
  { label: 'Уроки', to: routes.home() },
  { label: 'Урок 0', to: routes.alphabet() },
];

/** «Урок 0 · Алфавит и чтение»: карта курса, шаги по этапам и справочник. */
export function AlphabetPage() {
  const [params, setParams] = useSearchParams();
  const syncStep = useCallback(
    (id: string, initial: boolean) => setParams({ step: id }, { replace: initial }),
    [setParams],
  );

  // Справочник: все буквы и сочетания на одной странице. Старые ссылки ?section=… ведут сюда же.
  if (params.get('mode') === 'reference' || params.has('section')) {
    return <Reference section={params.get('section')} />;
  }

  const openStepId = params.get('step') ?? undefined;
  const header = (
    <SidebarSection title="Урок 0">
      <div className={styles.courseTitle}>{COURSE.title}</div>
      <Link to={routes.alphabetReference()} className={styles.headerLink}>
        Справочник алфавита <Arrow />
      </Link>
    </SidebarSection>
  );

  if (!openStepId) {
    return (
      <LessonMap
        course={{ id: COURSE.id, kicker: 'Урок 0', title: COURSE.title, summary: COURSE.summary }}
        stages={STAGES}
        branches={BRANCHES}
        storageKey={progressKey.reading}
        crumbs={[CRUMBS[0]!, { label: 'Урок 0' }]}
        onOpenStep={(id) => setParams({ step: id })}
        links={
          <Link to={routes.alphabetReference()}>
            Справочник алфавита <Arrow />
          </Link>
        }
        finish={{
          title: 'Вы читаете по-гречески!',
          text: <p>Все буквы, сочетания и правила ударения позади, экзамен сдан. Пора к глаголам.</p>,
          actions: (
            <>
              <Link to={routes.lesson(1)} className={buttonClassName('primary')}>
                К уроку 1
              </Link>
              <Link to={routes.cards()} className={buttonClassName('secondary')}>
                Слова в карточках
              </Link>
            </>
          ),
        }}
      />
    );
  }

  return (
    <LessonPath
      examId={COURSE.id}
      stages={STAGES}
      branches={BRANCHES}
      storageKey={progressKey.reading}
      openStepId={openStepId}
      onStepChange={syncStep}
      onOpenMap={() => {
        setParams({});
        window.scrollTo({ top: 0 });
      }}
      renderStep={(step, onGoal) => <ReadingStep step={step} onGoal={onGoal} />}
      sidebarHeader={header}
      crumbs={CRUMBS}
    />
  );
}

// ---------- справочник ----------

const speak = (text: string) => <SpeakButton text={text} />;
const word = wordIn(ALPHABET_DECK);

interface Section {
  id: string;
  title: string;
  practice?: boolean;
  intro: string;
  render: () => ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'letters',
    title: 'Буквы',
    intro:
      'Все 24 буквы: название, звук и пример. Главные ловушки: β — это «в», δ и θ — звуки, которых нет в русском, а «и» дают три буквы — η, ι, υ.',
    render: () => <LetterGrid letters={LETTERS} renderSpeak={speak} renderWord={word} />,
  },
  {
    id: 'combinations',
    title: 'Сочетания букв',
    intro: 'Пары букв, которые дают один звук. С ними вы прочитаете любое слово.',
    render: () => <CombinationList combinations={COMBINATIONS} renderSpeak={speak} renderWord={word} />,
  },
  {
    id: 'stress',
    title: 'Ударение и знаки',
    intro: 'Ударение, точки над буквами, знаки препинания и греческая раскладка.',
    render: () => <StressRules />,
  },
  {
    id: 'sounds',
    title: 'Буква → звук',
    practice: true,
    intro: 'Какой звук обозначает буква или сочетание? После ответа можно послушать название буквы.',
    render: () => <ChoiceQuiz items={SOUND_QUIZ} question="Какой звук?" />,
  },
  {
    id: 'words',
    title: 'Как читается слово',
    practice: true,
    intro: 'Прочитайте слово про себя и выберите правильное чтение. Варианты похожи — это типичные ошибки.',
    render: () => <ChoiceQuiz items={WORD_QUIZ} question="Как читается?" />,
  },
  {
    id: 'order',
    title: 'Алфавит по порядку',
    practice: true,
    intro: 'Нажимайте буквы от α до ω. Каждая верная буква произносится вслух.',
    render: () => <AlphabetOrder />,
  },
];

/** Справочник алфавита: всё на виду, без порядка — чтобы подсмотреть и повторить. */
function Reference({ section: raw }: { section: string | null }) {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const index = Math.max(0, SECTIONS.findIndex((s) => s.id === raw));
  const section = SECTIONS[index]!;
  const prev = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];

  const sidebar = (
    <>
      <SidebarSection title="Урок 0">
        <div className={styles.courseTitle}>{COURSE.title}</div>
        <Link to={routes.alphabet()} className={styles.headerLink}>
          <Arrow direction="left" /> К карте урока
        </Link>
      </SidebarSection>
      <SidebarSection title="Справочник">
        <button type="button" className={styles.navToggle} onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen}>
          <span>{section.title}</span>
          <span className={styles.chevron}>{navOpen ? '▴' : '▾'}</span>
        </button>
        <ol className={navOpen ? `${styles.links} ${styles.linksOpen}` : styles.links}>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <Link
                to={routes.alphabetReference(s.id)}
                className={s.id === section.id ? styles.linkActive : styles.link}
                onClick={() => setNavOpen(false)}
              >
                {s.title}
                {s.practice && <span className={styles.tag}>практика</span>}
              </Link>
            </li>
          ))}
        </ol>
      </SidebarSection>
    </>
  );

  const go = (id: string) => {
    navigate(routes.alphabetReference(id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <SidebarLayout sidebar={sidebar}>
      <header className={styles.head}>
        <Breadcrumbs items={[...CRUMBS, { label: 'Справочник' }]} />
        <div className={styles.kind}>Справочник алфавита</div>
        <h1 className={styles.title}>{section.title}</h1>
      </header>

      <Callout>{section.intro}</Callout>

      <div className={styles.body} key={section.id}>
        {section.render()}
      </div>

      <PrevNext
        prev={prev && { label: 'Назад', title: prev.title, onClick: () => go(prev.id) }}
        next={next && { label: 'Дальше', title: next.title, onClick: () => go(next.id) }}
      />
    </SidebarLayout>
  );
}
