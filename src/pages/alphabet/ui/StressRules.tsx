import { STRESS_EXAMPLES } from '@/entities/alphabet';
import { wordIn } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { Callout } from '@/shared/ui/callout';
import styles from './AlphabetPage.module.css';

const speak = (text: string) => <SpeakButton text={text} />;
/** Слова-примеры из алфавита попадают в набор «Алфавит». */
const word = wordIn({ id: 'alphabet', title: 'Алфавит' });

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

/** Правила ударения и знаков: шаг курса чтения и раздел справочника. */
export function StressRules() {
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

      <Callout kind="ok" title="Вы знаете все правила чтения">
        <p>Дальше — практика: чем больше вы читаете, тем быстрее глаз узнаёт буквы.</p>
      </Callout>
    </div>
  );
}
