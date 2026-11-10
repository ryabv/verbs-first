import { useCallback, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { getLesson, GrammarSectionView, lessonStages, PhraseList, type Lesson, type TableScope } from '@/entities/lesson';
import { getVerbs, type Verb } from '@/entities/verb';
import { LessonWords, lessonDecks, lessonWordDeck, TokenCard, wordIn } from '@/features/card-add';
import { ConjugationDrill } from '@/features/conjugation-drill';
import { progressKey } from '@/features/lesson-progress';
import { SpeakButton } from '@/features/pronounce';
import { ReadingView } from '@/features/text-reading';
import { LessonMap } from '@/widgets/lesson-map';
import { LessonPath } from '@/widgets/lesson-path';
import { VerbAlgorithm } from '@/widgets/verb-algorithm';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import { Arrow } from '@/shared/ui/ornament';
import styles from './LessonPage.module.css';

type Mode = 'path' | 'reference';

function parseMode(raw: string | null): Mode {
  return raw === 'reference' ? raw : 'path';
}
type TabId = 'grammar' | 'verbs' | 'reading' | 'words' | 'topic' | 'drill';

const TABS: { id: TabId; label: string }[] = [
  { id: 'grammar', label: 'Грамматика' },
  { id: 'verbs', label: 'Алгоритм глагола' },
  { id: 'reading', label: 'Текст для чтения' },
  { id: 'words', label: 'Слова урока' },
  { id: 'topic', label: 'Разговорная тема' },
  { id: 'drill', label: 'Тренажёр' },
];

const speakAction = (text: string) => <SpeakButton text={text} />;
/** Таблицы глаголов: начальная форма по тапу добавляется в набор «Глаголы» урока. */
const verbsRenderer = (lesson: Lesson) =>
  function renderVerbs(verbs: Verb[], scope?: TableScope) {
    return (
      <VerbAlgorithm
        verbs={verbs}
        tenses={scope?.tenses}
        forms={scope?.forms}
        renderWord={wordIn(lessonDecks(lesson).verbs)}
      />
    );
  };

export function LessonPage() {
  const { lessonId } = useParams();
  const [params, setParams] = useSearchParams();
  const lesson = getLesson(Number(lessonId));
  // Текущий шаг живёт в адресе (?step=…): ссылку можно сохранить, «назад» в браузере ведёт к прошлому шагу.
  const syncStep = useCallback(
    (id: string, initial: boolean) => {
      setParams(
        (p) => {
          p.set('step', id);
          if (p.get('mode') === 'homework') p.delete('mode');
          return p;
        },
        { replace: initial },
      );
    },
    [setParams],
  );

  if (!lesson) {
    return (
      <div className={styles.empty}>
        <p>Этот урок ещё не готов.</p>
        <Link to={routes.home()}>
          <Arrow direction="left" /> Ко всем урокам
        </Link>
      </div>
    );
  }

  const mode = parseMode(params.get('mode'));
  const crumbs: Crumb[] = [
    { label: 'Уроки', to: routes.home() },
    { label: `Урок ${lesson.id}`, to: routes.lesson(lesson.id) },
  ];
  const header = <LessonSidebarHeader lesson={lesson} mode={mode} />;

  if (mode === 'reference') {
    return <Reference lesson={lesson} tab={params.get('tab')} header={header} crumbs={crumbs} />;
  }

  const next = getLesson(lesson.id + 1);
  const stages = lessonStages(lesson);
  // Старые ссылки ?mode=homework ведут на первый шаг домашнего задания.
  const openStepId = params.get('step') ?? (params.get('mode') === 'homework' ? lesson.homework[0]?.id : undefined);
  const openStep = (id: string) => setParams({ step: id });
  const openMap = () => setParams({});

  // Без шага в адресе — карта урока: этапы на дорожке и медальоны за них.
  if (!openStepId) {
    return (
      <LessonMap
        lesson={lesson}
        stages={stages}
        storageKey={progressKey.lesson(lesson.id)}
        crumbs={[crumbs[0]!, { label: `Урок ${lesson.id}` }]}
        onOpenStep={openStep}
        links={
          <Link to={`${routes.lesson(lesson.id)}?mode=reference`}>
            Справочник урока <Arrow />
          </Link>
        }
        finish={{
          title: `Урок ${lesson.id} пройден!`,
          text: (
            <p>
              Урок, домашнее задание и экзамен позади: «таблица умножения» для {lesson.verbIds.length} глаголов у вас в
              руках. Повторяйте слова в карточках — и вперёд.
            </p>
          ),
          actions: (
            <>
              {next ? (
                <Link to={routes.lesson(next.id)} className={buttonClassName('primary')}>
                  Следующий урок
                </Link>
              ) : (
                <Link to={routes.home()} className={buttonClassName('primary')}>
                  Ко всем урокам
                </Link>
              )}
              <Link to={routes.cards({ lesson: lesson.id })} className={buttonClassName('secondary')}>
                Слова урока в карточках
              </Link>
            </>
          ),
        }}
      />
    );
  }

  return (
    <LessonPath
      lesson={lesson}
      stages={stages}
      storageKey={progressKey.lesson(lesson.id)}
      openStepId={openStepId}
      onStepChange={syncStep}
      onOpenMap={() => {
        openMap();
        window.scrollTo({ top: 0 });
      }}
      renderVerbs={verbsRenderer(lesson)}
      sidebarHeader={header}
      crumbs={crumbs}
    />
  );
}

/** Верх сайдбара: урок и ссылка на справочник (он не этап учёбы, а шпаргалка). */
function LessonSidebarHeader({ lesson, mode }: { lesson: Lesson; mode: Mode }) {
  const base = routes.lesson(lesson.id);
  return (
    <SidebarSection title={`Урок ${lesson.id}`}>
      <div className={styles.lessonTitle}>{lesson.title}</div>
      {mode === 'reference' ? (
        <Link to={base} className={styles.headerLink}>
          <Arrow direction="left" /> К карте урока
        </Link>
      ) : (
        <Link to={`${base}?mode=reference`} className={styles.headerLink}>
          Справочник урока <Arrow />
        </Link>
      )}
    </SidebarSection>
  );
}

interface ReferenceProps {
  lesson: Lesson;
  tab: string | null;
  header: ReactNode;
  crumbs: Crumb[];
}

/** Всё содержимое урока без порядка — чтобы быстро найти и повторить. */
function Reference({ lesson, tab: rawTab, header, crumbs }: ReferenceProps) {
  const current = TABS.find((t) => t.id === rawTab) ?? TABS[0]!;
  const coreVerbs = getVerbs(lesson.coreVerbIds);
  const lessonVerbs = getVerbs(lesson.verbIds);
  const base = `${routes.lesson(lesson.id)}?mode=reference`;
  const decks = lessonDecks(lesson);
  const wordDeck = lessonWordDeck(lesson);
  const exampleWord = wordIn(decks.examples, wordDeck);

  const sidebar = (
    <>
      {header}
      <SidebarSection title="Разделы">
        <ul className={styles.links}>
          {TABS.map((t) => (
            <li key={t.id}>
              <Link to={`${base}&tab=${t.id}`} className={t.id === current.id ? styles.linkActive : styles.link}>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </SidebarSection>
    </>
  );

  return (
    <SidebarLayout sidebar={sidebar}>
      <header className={styles.head}>
        <Breadcrumbs items={[...crumbs, { label: 'Справочник' }]} />
        <h1 className={styles.title}>{current.id === 'topic' ? lesson.topic.title : current.label}</h1>
      </header>

      <div className={styles.body}>
        {current.id === 'grammar' &&
          lesson.grammar.map((section) => (
            <GrammarSectionView
              key={section.id}
              section={section}
              renderPhraseAction={speakAction}
              renderGreek={exampleWord}
            />
          ))}

        {current.id === 'verbs' && verbsRenderer(lesson)([...coreVerbs, ...lessonVerbs])}

        {current.id === 'reading' &&
          lesson.readings.map((reading) => (
            <ReadingView
              key={reading.id}
              reading={reading}
              verbs={[...coreVerbs, ...lessonVerbs]}
              renderAdd={(token) => <TokenCard token={token} deckFor={wordDeck} />}
            />
          ))}

        {current.id === 'words' && <LessonWords lesson={lesson} />}

        {current.id === 'topic' && (
          <>
            <PhraseList phrases={lesson.topic.phrases} renderAction={speakAction} renderGreek={wordIn(decks.phrases, wordDeck)} />
            <h2>Мини-презентация</h2>
            <p>{lesson.topic.presentation.task}</p>
            <PhraseList phrases={lesson.topic.presentation.sample} renderAction={speakAction} renderGreek={exampleWord} />
          </>
        )}

        {current.id === 'drill' && <ConjugationDrill verbs={lessonVerbs} />}
      </div>
    </SidebarLayout>
  );
}
