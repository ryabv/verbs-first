import type { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { getLesson, GrammarSectionView, PhraseList, type Lesson } from '@/entities/lesson';
import { getVerbs, type Verb } from '@/entities/verb';
import { ConjugationDrill } from '@/features/conjugation-drill';
import { progressKey } from '@/features/lesson-progress';
import { SpeakButton } from '@/features/pronounce';
import { ReadingView } from '@/features/text-reading';
import { LessonPath } from '@/widgets/lesson-path';
import { VerbAlgorithm } from '@/widgets/verb-algorithm';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs, type Crumb } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import styles from './LessonPage.module.css';

type Mode = 'path' | 'homework' | 'reference';

function parseMode(raw: string | null): Mode {
  return raw === 'reference' || raw === 'homework' ? raw : 'path';
}
type TabId = 'grammar' | 'verbs' | 'reading' | 'topic' | 'drill';

const TABS: { id: TabId; label: string }[] = [
  { id: 'grammar', label: 'Грамматика' },
  { id: 'verbs', label: 'Алгоритм глагола' },
  { id: 'reading', label: 'Текст для чтения' },
  { id: 'topic', label: 'Разговорная тема' },
  { id: 'drill', label: 'Тренажёр' },
];

const speakAction = (text: string) => <SpeakButton text={text} />;
const renderVerbs = (verbs: Verb[]) => <VerbAlgorithm verbs={verbs} />;

export function LessonPage() {
  const { lessonId } = useParams();
  const [params] = useSearchParams();
  const lesson = getLesson(Number(lessonId));

  if (!lesson) {
    return (
      <div className={styles.empty}>
        <p>Этот урок ещё не готов.</p>
        <Link to={routes.home()}>← Ко всем урокам</Link>
      </div>
    );
  }

  const mode = parseMode(params.get('mode'));
  const crumbs: Crumb[] = [
    { label: 'Уроки', to: routes.home() },
    { label: `Урок ${lesson.id}`, to: routes.lesson(lesson.id) },
  ];
  const header = <LessonSidebarHeader lesson={lesson} mode={mode} />;

  const base = routes.lesson(lesson.id);

  if (mode === 'reference') {
    return <Reference lesson={lesson} tab={params.get('tab')} header={header} crumbs={crumbs} />;
  }

  if (mode === 'homework') {
    return (
      <LessonPath
        key="homework"
        lesson={lesson}
        steps={lesson.homework}
        storageKey={progressKey.homework(lesson.id)}
        stepsTitle="Домашнее задание"
        renderVerbs={renderVerbs}
        sidebarHeader={header}
        crumbs={[...crumbs, { label: 'Домашнее задание', to: `${base}?mode=homework` }]}
        finish={{
          title: 'Домашнее задание выполнено!',
          text: (
            <p>
              Схема урока {lesson.id} у вас в руках. Перед следующим уроком разомнитесь 5 минут в свободном
              тренажёре — и вперёд.
            </p>
          ),
          actions: (
            <>
              {getLesson(lesson.id + 1) ? (
                <Link to={routes.lesson(lesson.id + 1)} className={buttonClassName('primary')}>
                  Следующий урок
                </Link>
              ) : (
                <Link to={routes.home()} className={buttonClassName('primary')}>
                  Ко всем урокам
                </Link>
              )}
              <Link to={`${base}?mode=reference&tab=drill`} className={buttonClassName('secondary')}>
                Свободная тренировка
              </Link>
            </>
          ),
        }}
      />
    );
  }

  return (
    <LessonPath
      key="path"
      lesson={lesson}
      steps={lesson.steps}
      storageKey={progressKey.lesson(lesson.id)}
      stepsTitle="Шаги урока"
      renderVerbs={renderVerbs}
      sidebarHeader={header}
      crumbs={crumbs}
      finish={{
        title: `Урок ${lesson.id} пройден!`,
        text: (
          <p>
            Вы прошли всю «таблицу умножения» для {lesson.verbIds.length} глаголов. Теперь главное — довести её
            до автоматизма: домашнее задание рассчитано на три дня по 20–30 минут.
          </p>
        ),
        actions: (
          <>
            <Link to={`${base}?mode=homework`} className={buttonClassName('primary')}>
              К домашнему заданию
            </Link>
            <Link to={routes.home()} className={buttonClassName('secondary')}>
              Ко всем урокам
            </Link>
          </>
        ),
      }}
    />
  );
}

function LessonSidebarHeader({ lesson, mode }: { lesson: Lesson; mode: Mode }) {
  const base = routes.lesson(lesson.id);
  return (
    <SidebarSection title={`Урок ${lesson.id}`}>
      <div className={styles.lessonTitle}>{lesson.title}</div>
      <div className={styles.modes}>
        <Link to={base} className={mode === 'path' ? styles.modeActive : styles.mode}>
          Урок
        </Link>
        <Link to={`${base}?mode=homework`} className={mode === 'homework' ? styles.modeActive : styles.mode}>
          Домашнее задание
        </Link>
        <Link to={`${base}?mode=reference`} className={mode === 'reference' ? styles.modeActive : styles.mode}>
          Справочник
        </Link>
      </div>
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
            <GrammarSectionView key={section.id} section={section} renderPhraseAction={speakAction} />
          ))}

        {current.id === 'verbs' && <VerbAlgorithm verbs={[...coreVerbs, ...lessonVerbs]} />}

        {current.id === 'reading' &&
          lesson.readings.map((reading) => (
            <ReadingView key={reading.id} reading={reading} verbs={[...coreVerbs, ...lessonVerbs]} />
          ))}

        {current.id === 'topic' && (
          <>
            <PhraseList phrases={lesson.topic.phrases} renderAction={speakAction} />
            <h2>Мини-презентация</h2>
            <p>{lesson.topic.presentation.task}</p>
            <PhraseList phrases={lesson.topic.presentation.sample} renderAction={speakAction} />
          </>
        )}

        {current.id === 'drill' && <ConjugationDrill verbs={lessonVerbs} />}
      </div>
    </SidebarLayout>
  );
}
