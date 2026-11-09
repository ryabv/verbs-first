import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  COMBINATIONS,
  CombinationList,
  LETTERS,
  LetterGrid,
  SOUND_QUIZ,
  STRESS_EXAMPLES,
  WORD_QUIZ,
} from '@/entities/alphabet';
import { AlphabetOrder, ChoiceQuiz } from '@/features/alphabet-quiz';
import { buildAlphabetExam, Exam } from '@/features/exam';
import { wordIn } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import { Callout } from '@/shared/ui/callout';
import { PrevNext } from '@/shared/ui/prev-next';
import { SidebarLayout, SidebarSection } from '@/shared/ui/sidebar-layout';
import styles from './AlphabetPage.module.css';

const speak = (text: string) => <SpeakButton text={text} />;
/** Слова-примеры из алфавита попадают в набор «Алфавит». */
const word = wordIn({ id: 'alphabet', title: 'Алфавит' });

interface Section {
  id: string;
  title: string;
  kind: 'Читаем' | 'Практика' | 'Экзамен';
  intro: string;
  render: () => ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'letters',
    title: 'Буквы',
    kind: 'Читаем',
    intro:
      'В греческом алфавите 24 буквы, многие знакомы по русскому или по математике. Главные ловушки: β — это «в», δ и θ — звуки, которых нет в русском, а «и» дают три буквы — η, ι, υ (с сочетаниями букв способов шесть, о них в следующем разделе). Нажимайте на динамик — слушайте название буквы и пример.',
    render: () => <LetterGrid letters={LETTERS} renderSpeak={speak} renderWord={word} />,
  },
  {
    id: 'combinations',
    title: 'Сочетания букв',
    kind: 'Читаем',
    intro:
      'Греческий читается почти всегда так, как пишется, — но некоторые пары букв дают один звук. Выучив эту страницу, вы сможете прочитать любое слово.',
    render: () => <CombinationList combinations={COMBINATIONS} renderSpeak={speak} renderWord={word} />,
  },
  {
    id: 'stress',
    title: 'Ударение и знаки',
    kind: 'Читаем',
    intro: 'Последние правила — и можно читать.',
    render: () => <StressRules />,
  },
  {
    id: 'sounds',
    title: 'Буква → звук',
    kind: 'Практика',
    intro: 'Какой звук обозначает буква или сочетание? После ответа можно послушать название буквы.',
    render: () => <ChoiceQuiz items={SOUND_QUIZ} question="Какой звук?" />,
  },
  {
    id: 'words',
    title: 'Как читается слово',
    kind: 'Практика',
    intro:
      'Прочитайте слово про себя и выберите правильное чтение. Варианты похожи — это типичные ошибки. После ответа послушайте слово и повторите вслух.',
    render: () => <ChoiceQuiz items={WORD_QUIZ} question="Как читается?" />,
  },
  {
    id: 'order',
    title: 'Алфавит по порядку',
    kind: 'Практика',
    intro:
      'Выучите алфавит по порядку: нажимайте буквы от α до ω. Каждая верная буква произносится вслух. Ошиблись дважды на одной букве — подсветим нужную. На компьютере можно печатать с греческой раскладки.',
    render: () => <AlphabetOrder />,
  },
  {
    id: 'exam',
    title: 'Экзамен по алфавиту',
    kind: 'Экзамен',
    intro:
      'Проверка всего раздела: буквы, сочетания, чтение слов, ударение и знаки, порядок букв. Правила строже, чем в тренажёрах: ответ — только в конце.',
    render: () => (
      <Exam
        id="alphabet"
        title="Экзамен по алфавиту"
        build={buildAlphabetExam}
        rules={[
          '20 вопросов по всему разделу: звуки букв и сочетаний, чтение слов, ударение и знаки, порядок букв.',
          'Озвучки по ходу нет — она подсказывает. Послушать можно в разборе.',
        ]}
        actions={
          <Link to={routes.lesson(1)} className={buttonClassName('secondary')}>
            К уроку 1
          </Link>
        }
      />
    ),
  },
];

type ExampleId = keyof typeof STRESS_EXAMPLES;

/** Пример: слово (по тапу — в карточки) + озвучка, по желанию — чтение и перевод. */
function Ex({ id, full = false }: { id: ExampleId; full?: boolean }) {
  const e = STRESS_EXAMPLES[id];
  return (
    <span className={styles.example}>
      {word(e.greek, e.russian)}
      {speak(e.greek)}
      {full && (
        <>
          {' '}
          <span className={styles.reading}>[{e.reading}]</span> — {e.russian}
        </>
      )}
    </span>
  );
}

/** Список примеров: по одному на строку, с чтением и переводом. */
function Examples({ ids, note }: { ids: ExampleId[]; note?: Partial<Record<ExampleId, string>> }) {
  return (
    <ul className={styles.examples}>
      {ids.map((id) => (
        <li key={id}>
          <Ex id={id} full />
          {note?.[id] && <span className={styles.note}>{note[id]}</span>}
        </li>
      ))}
    </ul>
  );
}

function StressRules() {
  return (
    <div className={styles.rules}>
      <h2>Ударение — τόνος</h2>
      <p>
        В каждом слове из двух и более слогов ударение <b>всегда</b> отмечено знаком. Читать ударение легко — оно
        написано. Ударный слог произносится чуть сильнее, но безударные гласные не «съедаются»:{' '}
        <span lang="el">ο</span> всегда «о», не «а».
      </p>
      <Examples ids={['kalimera', 'efcharisto']} />
      <p>Ударение различает слова:</p>
      <Examples ids={['pote', 'potee', 'pou', 'pouRel']} />
      <p>У заглавной буквы знак ставится слева. В словах ЗАГЛАВНЫМИ буквами ударение не пишут.</p>
      <Examples ids={['anna', 'ela']} />

      <h2>Две точки — διαλυτικά</h2>
      <p>
        Точки над ι или υ значат: читать гласные <b>раздельно</b>, а не как сочетание.
      </p>
      <Examples
        ids={['troley', 'kaiki']}
        note={{ troley: 'εϊ — «эи», а не «и»', kaiki: 'αϊ — «аи», а не «э»' }}
      />
      <p>
        Если ударение падает на <b>первую</b> гласную, точки не нужны — знак ударения и так показывает, что
        гласные раздельные. Без ударения на ней — обычное сочетание:
      </p>
      <Examples ids={['tsai', 'kai']} note={{ tsai: 'ά + ι — раздельно', kai: 'αι — «э»' }} />

      <h2>Сигма в конце слова</h2>
      <p>Внутри слова — σ, в конце — ς. Это одна и та же буква.</p>
      <Examples ids={['filos', 'simera']} />

      <h2>Знаки препинания</h2>
      <p>
        <b>;</b> — греческий <b>вопросительный знак</b>:
      </p>
      <Examples ids={['tiKaneis']} />
      <p>
        <b>·</b> (точка сверху, άνω τελεία) — как наши точка с запятой или двоеточие:
      </p>
      <Examples ids={['aderfia']} />

      <h2>Как печатать по-гречески</h2>
      <p>В заданиях вы будете писать по-гречески. Добавьте греческую раскладку — это минута:</p>
      <ul>
        <li>
          <b>macOS:</b> Системные настройки → Клавиатура → Источники ввода → «+» → Греческий.
        </li>
        <li>
          <b>Windows:</b> Параметры → Время и язык → Язык → Добавить язык → Ελληνικά.
        </li>
        <li>
          <b>iPhone / Android:</b> настройки клавиатуры → Добавить клавиатуру → Греческий.
        </li>
      </ul>
      <p>
        <b>Ударение</b> на компьютере: сначала клавиша, где у латиницы стоит <b>;</b> (у русской раскладки — «ж»),
        потом гласная: <span lang="el">ά έ ή ί ό ύ ώ</span>. На телефоне — долгое нажатие на гласную.
        Конечная <span lang="el">ς</span> — клавиша, где у латиницы <b>W</b>.
      </p>
      <p>
        Нет раскладки под рукой — в каждом упражнении есть экранные греческие буквы. А ошибка только в ударении
        засчитывается как «почти».
      </p>

      <Callout kind="ok" title="Вы готовы читать">
        <p>
          Закрепите на тренажёрах, сдайте экзамен по алфавиту — и переходите к{' '}
          <Link to={routes.lesson(1)}>уроку 1</Link>: там уже нужно читать глаголы.
        </p>
      </Callout>
    </div>
  );
}

/** «Алфавит»: отдельная часть до базового курса. */
export function AlphabetPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const index = Math.max(
    0,
    SECTIONS.findIndex((s) => s.id === params.get('section')),
  );
  const section = SECTIONS[index]!;
  const prev = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];

  const go = (id: string) => {
    navigate(routes.alphabet(id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sidebar = (
    <>
      <SidebarSection title="Перед курсом">
        <div className={styles.partTitle}>Алфавит и чтение</div>
      </SidebarSection>
      <SidebarSection title="Разделы">
        <ol className={styles.links}>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <Link to={routes.alphabet(s.id)} className={s.id === section.id ? styles.linkActive : styles.link}>
                {s.title}
                {s.kind === 'Практика' && <span className={styles.tag}>практика</span>}
                {s.kind === 'Экзамен' && <span className={`${styles.tag} ${styles.tagExam}`}>экзамен</span>}
              </Link>
            </li>
          ))}
        </ol>
      </SidebarSection>
    </>
  );

  return (
    <SidebarLayout sidebar={sidebar}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'Уроки', to: routes.home() }, { label: 'Алфавит', to: routes.alphabet() }]} />
        <div className={section.kind === 'Экзамен' ? `${styles.kind} ${styles.kindExam}` : styles.kind}>{section.kind}</div>
        <h1 className={styles.title}>{section.title}</h1>
      </header>

      <Callout>{section.intro}</Callout>

      {/* key: при смене раздела тренажёр начинается заново, а не переносит состояние другого. */}
      <div className={styles.body} key={section.id}>
        {section.render()}
      </div>

      <PrevNext
        prev={prev && { label: 'Назад', title: prev.title, onClick: () => go(prev.id) }}
        next={
          next
            ? { label: 'Дальше', title: next.title, onClick: () => go(next.id) }
            : { label: 'Алфавит пройден', title: 'К уроку 1', onClick: () => navigate(routes.lesson(1)) }
        }
      />
    </SidebarLayout>
  );
}
