import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { COMBINATIONS, CombinationList, LETTERS, LetterGrid, SOUND_QUIZ, WORD_QUIZ } from '@/entities/alphabet';
import { AlphabetOrder, ChoiceQuiz } from '@/features/alphabet-quiz';
import { wordIn } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { Callout } from '@/shared/ui/callout';
import { Arrow } from '@/shared/ui/ornament';
import { PrevNext } from '@/shared/ui/prev-next';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import { PROLOGUE_NOTES, PROLOGUE_STEPS } from '../lib/prologue';
import { PrologueNotePage, PrologueOverview, PrologueStep } from './ProloguePage';
import { ALPHABET_DECK } from './ReadingStep';
import { StressRules } from './StressRules';
import styles from './AlphabetPage.module.css';

const CRUMBS: Crumb[] = [
  { label: 'История', to: routes.story() },
  { label: 'Пролог', to: routes.alphabet() },
];

/**
 * Пролог «Греческий алфавит» — в формате глав: /alphabet — оглавление, /alphabet/:n — шаг, /alphabet/note/:id —
 * заметка Анны; ?mode=reference — справочник алфавита. Старые ссылки ?step=<id> ведут на шаг.
 */
export function AlphabetPage() {
  const [params] = useSearchParams();
  const { step, note } = useParams();

  // Справочник: все буквы и сочетания на одной странице. Старые ссылки ?section=… ведут сюда же.
  if (params.get('mode') === 'reference' || params.has('section')) {
    return <Reference section={params.get('section')} />;
  }
  const legacy = params.get('step');
  if (legacy) {
    const i = PROLOGUE_STEPS.findIndex((s) => s.id === legacy);
    const n = PROLOGUE_NOTES.find((x) => x.step.id === legacy);
    return <Navigate to={n ? routes.alphabetNote(n.id) : i >= 0 ? routes.alphabetStep(i + 1) : routes.alphabet()} replace />;
  }
  if (note !== undefined) {
    const n = PROLOGUE_NOTES.find((x) => x.id === note);
    return n ? <PrologueNotePage note={n} /> : <Navigate to={routes.alphabet()} replace />;
  }
  if (step !== undefined) {
    const index = Number(step) - 1;
    return PROLOGUE_STEPS[index] ? <PrologueStep index={index} /> : <Navigate to={routes.alphabet()} replace />;
  }
  return <PrologueOverview />;
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
      <SidebarSection title="Пролог">
        <div className={styles.courseTitle}>Греческий алфавит</div>
        <Link to={routes.alphabet()} className={styles.headerLink}>
          <Arrow direction="left" /> К прологу
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
