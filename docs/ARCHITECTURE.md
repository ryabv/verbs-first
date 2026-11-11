# Архитектура Verbs First

Техническое устройство приложения. Что делает продукт и почему — в [PRODUCT.md](PRODUCT.md).

## Коротко

- **SPA без бэкенда.** Весь контент (глаголы, уроки, ДЗ) лежит в бандле как TypeScript-данные.
  Прогресс и черновики — в `localStorage` браузера.
- **Стек:** React 19, TypeScript 7 (`tsgo`), react-router 8 (`createBrowserRouter`),
  rspack 2 (сборка и dev-сервер), pnpm 12, обычный CSS Modules. Без Next, без CSS-фреймворков,
  без state-менеджеров.
- **Архитектура:** [Feature-Sliced Design](https://feature-sliced.design).
- **Озвучка:** заранее сгенерированные mp3 (`public/audio`) + манифест «текст → файл».
- **Хостинг:** GitHub Pages, деплой через GitHub Actions при пуше в `main`.

## Команды

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit — обязательно перед коммитом
pnpm lint         # oxlint (запускается сам перед каждым коммитом)
pnpm lint:fix     # автоисправление
pnpm build        # dist/
pnpm audio        # догенерировать mp3 для новых греческих фраз (нужен .venv с edge-tts)
```

Проверки в CI: `lint` + `typecheck` + `build`. Тестов пока нет.

**Линтер** — [oxlint](https://oxc.rs), конфиг `.oxlintrc.json`: плагины typescript, react,
jsx-a11y, import, unicorn, oxc; `correctness` — ошибка, `suspicious`/`perf` — предупреждения.
`react-perf` выключен намеренно: в проекте нет `memo`, его советы — шум.
**Pre-commit хук** ставит `simple-git-hooks` через скрипт `prepare` (при `pnpm install`):
`pnpm lint` перед каждым коммитом. Пропустить в крайнем случае: `SKIP_SIMPLE_GIT_HOOKS=1 git commit …`.
Чинить замечания в коде, а не выключать правила; `autoFocus` заменён на фокус из эффекта
(правило jsx-a11y/no-autofocus).

## Слои FSD

Импорт разрешён только «вниз»: `app → pages → widgets → features → entities → shared`.
Каждый слайс наружу отдаёт только то, что в его `index.ts` (public API); глубокие импорты
в чужие слайсы запрещены (исключение — `scripts/`, см. ниже).

```
src/
  app/                    точка входа, роутер, глобальные стили и токены темы
  pages/
    home/                 оглавление курса (16 уроков, прогресс урока и ДЗ)
    lesson/               страница урока: один путь (урок → ДЗ → экзамен) + ?mode=reference
    cards/                карточки: наборы, тренировка, добавление своих слов
    alphabet/             «Урок 0»: карта курса чтения, шаги (?step=), справочник (?mode=reference)
    texts/                «Тексты»: список по уровням (/texts) и чтение (/texts/:id), «знакомо N% слов»
    story/                «История»: главы (/story), глава (/story/:id), шаг (/story/:id/:n), вся глава (/story/:id/end)
  widgets/
    app-header, app-footer
    lesson-map/           карта урока: этапы на дорожке, медальоны, финал урока
    lesson-path/          шаги этапа: сайдбар со списком шагов этапа, контент шага, prev/next
    verb-algorithm/       список глаголов + таблица 3×3 / все лица выбранного глагола
  features/
    conjugation-drill/    тренажёр «таблицы умножения» (одна форма глагола)
    sentence-trainer/     фразы целиком: translate / dictation / oral
    text-reading/         текст: клик по слову → разбор, перевод, «найди глаголы», вопросы
    composition-check/    сочинение с чек-листом, который отмечается сам
    card-add/             «Слова урока»: группы слов урока с кнопками «в карточки»
    card-editor/          форма «добавить любое слово» в любой/новый набор
    card-training/        тренажёр карточек: режимы, план на сегодня, сессия, итог
    alphabet-quiz/        ChoiceQuiz (в т.ч. «услышь и выбери»), SyllableGrid, WordLadder, BuildWord, TextReader, AlphabetOrder
    lesson-progress/      прогресс по шагам (localStorage)
    pronounce/            кнопка озвучки SpeakButton
    theme-switcher/       светлая/тёмная тема
  entities/
    verb/                 модель глагола, данные, сборка фраз, анализатор текста, VerbTable
    lesson/               модель урока, контент уроков, api getLesson/getLessonCatalog
    card/                 карточки и наборы: хранилище (localStorage), прогресс по словам, проверка ответов
    alphabet/             буквы, сочетания, тренажёры, курс чтения READING_COURSE + LetterGrid, LetterIntroList, CombinationList
    library/              тексты для чтения LIBRARY_TEXTS (уровень, жанр, о чём) и отметки «прочитано»
    story/                история-сериал STORY_CHAPTERS (глава = урок: текст, шаги с задачами, конспект) и прогресс шагов
  shared/
    lib/greek/            нормализация греческого, сравнение ответов
    lib/speech/           speak(): mp3 из манифеста или греческий голос браузера
    ui/                   Button, Callout, Breadcrumbs, PrevNext, SidebarLayout, GreekKeyboard, icon
    config/routes.ts      построители URL
```

### Как обходим запрет «слой не импортирует соседа»

- **widgets не импортируют widgets** → слоты. `LessonPath` получает `renderVerbs`,
  а страница передаёт туда `VerbAlgorithm`. `VerbTable` (entity) получает `renderCellAction`,
  чтобы показать `SpeakButton` (feature).
- **entities не импортируют entities** → `@x`-нотация: `entities/verb/@x/lesson.ts`
  отдаёт типы `Tense`, `SentenceForm` для `entities/lesson`.
- **Известный долг:** `text-reading`, `sentence-trainer`, `composition-check` импортируют
  `SpeakButton` из `features/pronounce`. По FSD это кросс-импорт фич. Если станет мешать —
  перенести `SpeakButton` в `shared/ui` (он зависит только от `shared/lib/speech`) или
  передавать слотом.

## Модель данных

### Глагол — `entities/verb/model/types.ts`

```ts
interface Verb {
  id: string;                 // 'grafo'
  lemma: string;              // 'γράφω'
  translation: string;        // 'писать'
  group: 'A' | 'B1' | 'B2' | 'irregular' | 'deponent';
  greek:   { present: PersonForms; past: PersonForms; perfective: PersonForms };
  russian: { present: PersonForms; past: PersonForms; future: PersonForms };
  pastHint?: string;          // подсказка, как образуется аорист
}
type PersonForms = [я, ты, он/она, мы, вы, они];   // 6 строк; варианты через '/': 'ακούν/ακούνε'
```

- Формы хранятся **явно**, правилами не генерируются: так их проще вычитывать носителем
  и неправильные глаголы не ломают код.
- Греческая модель времени: `present` (настоящее), `past` (аорист), `perfective`
  (совершенная основа; будущее = `θα` + perfective; позже на ней же строятся `να`-конструкции).
- `Cell = { tense: 'past'|'present'|'future'; form: 'affirmative'|'question'|'negative'; person: 0..5 }`.
- `buildGreek(verb, cell)` → варианты фразы (`Δεν θα γράψω.`, `Γράφεις;`), `[0]` — показываемый.
  `buildRussian(verb, cell)` — русская фраза с местоимением.
- `createAnalyzer(verbs)` → функция `analyze(text) → TextToken[]`: токенизирует текст и находит
  формы глаголов урока (время, лица, отрицание; `θα` + perfective = будущее). Используется
  в разборе текста и в проверке сочинения. Ключ слова — `stripAccents` (нижний регистр,
  без ударений, конечная `ς` → `σ`).

### Урок — `entities/lesson/model/types.ts`

```ts
interface Lesson {
  id: number; title: string; summary: string;
  grammar: GrammarSection[];          // разделы теории {id, title, paragraphs, examples?}
  topic: { title; phrases: Phrase[]; presentation: CompositionTask };
  coreVerbIds: string[];              // опорные (είμαι, έχω): в таблицах, но не в тренажёре
  verbIds: string[];                  // 8 глаголов урока
  readings: ReadingText[];            // тексты: предложения + glossary + вопросы + findTense
  vocabulary: VocabGroup[];           // новые слова по группам {id, title, words: Phrase[]} (кроме глаголов и фраз темы)
  steps: LessonStep[];                // путь урока; у каждого шага stage (этап)
  stages: StageInfo[];                // этапы урока {title, award}: точки на карте и медальоны
  branches: LessonBranch[];           // ответвления {id, stage, title, steps}: необязательные шаги этапа
  homework: LessonStep[];             // ДЗ: те же шаги с полем part (часть 1, 2, 3, 4)
  homeworkParts: HomeworkPart[];      // части ДЗ {title, after}: after — после какого этапа урока
}
```

`LessonStep` — дискриминированное объединение по `kind`:

| kind | Что показывает | Данные шага | Засчитывается |
|---|---|---|---|
| `theory` | разделы `grammar` | `sectionIds` | по кнопке «дальше» |
| `verbs` | таблицы глаголов | `verbIds?` (по умолчанию — глаголы урока без опорных), `scope? {tenses?, forms?}` — только пройденные клетки | по кнопке |
| `drill` | `ConjugationDrill` | `scope {verbIds?, tenses?, forms?}`, `goal` | только по цели |
| `reading` | `ReadingView` | `readingId` | по кнопке |
| `phrases` | фразы темы | — | по кнопке |
| `presentation` | `CompositionEditor` с `topic.presentation` | — | по кнопке |
| `translate` | `SentenceTrainer` RU → GR | `items: SentenceItem[]` | только когда все фразы решены |
| `dictation` | `SentenceTrainer` на слух | `items` | то же |
| `oral` | `SentenceTrainer` вслух + самопроверка | `items` | то же |
| `composition` | `CompositionEditor` | `composition: CompositionTask` | по кнопке |
| `words` | `LessonWords` (слова урока → карточки) | — | по кнопке |
| `story` | «Любопытно»: рассказ, примеры с озвучкой, новые слова → карточки | `paragraphs`, `examples?`, `words?` | по кнопке |

Общие поля шага: `id`, `title`, `intro?` (реплика «преподавателя»), `stage?` (этап урока, 1… → `stages[n-1]`), `part?` (часть ДЗ).
`SentenceItem = { russian; greek: string[] }` — `greek[0]` эталон, остальные тоже верны.
Названия шагов **не повторяют** тип (тип показывает чип и подпись над заголовком).

Новый `kind` = тип в `types.ts` + ветка в `widgets/lesson-path/ui/StepContent.tsx` +
`KIND_LABELS`/`KIND_TAGS` в `StepList.tsx` + (если засчитывается по выполнению)
`GOAL_KINDS` в `LessonPath.tsx` + сбор озвучки в `scripts/generate-audio.ts`.

### Контент

```
entities/lesson/data/
  catalog.ts               названия всех 16 уроков (оглавление; урок «доступен», если есть в LESSONS)
  lesson-01.ts             урок 1
  lesson-01-homework.ts    ДЗ урока 1 и второй текст
  lesson-02*.ts            урок 2 (то же деление: урок, ДЗ + текст, ответвления)
entities/lesson/api/lessonApi.ts   LESSONS = { 1: lesson01, 2: lesson02 } — регистрация уроков
entities/verb/data/verbs.ts        словарь глаголов
docs/curriculum.md                 план всех 16 уроков (глаголы, грамматика, темы)
```

`knownVerbIds(lesson)` — глаголы этого и всех прошлых уроков: по ним разбираются тексты и сочинения
(в текстах урока N встречаются глаголы прошлых уроков). Тренажёр и экзамен — только `lesson.verbIds`.

`lessonApi.ts` — единственное место, которое знает, что контент в бандле. Если появится
бэкенд/CMS, меняется только он; сигнатуры `getLesson` / `getLessonCatalog` остаются.

## Ключевые механизмы

### Роутинг и режимы урока

- `/` — `HomePage`, `/lesson/:lessonId` — `LessonPage`, `/cards[?lesson=N]` — `CardsPage`
  (с `lesson` сразу выбраны наборы этого урока), `/alphabet[?step=…]`, `/alphabet?mode=reference[&section=letters|combinations|stress|sounds|words|order]` (старые `?section=` ведут в справочник) —
  `AlphabetPage` (разделы описаны массивом `SECTIONS` в самой странице).
- Урок — **один путь** `lessonPath(lesson)` (`entities/lesson/lib/path.ts`): этапы урока, после
  каждого — части `homework` с `after` = этот этап, в конце шаг `exam`. `sectionOf(step)` — часть пути (`lesson` / `homework` /
  `exam`); `StepList` рисует заголовки частей и «Часть N · название» из `homeworkParts`,
  нумерация — внутри части. Никаких «дней» (без давления сроками).
- **Этапы:** `lessonStages(lesson)` делит путь на `LessonStage {id, section, n, num, title, kicker?, award, steps}`
  (`n` — номер на карте, `num` — номер внутри вида: буква темы, номер части ДЗ). Знак точки —
  `StageMark` из `shared/ui/ornament`: тема — медальон, ДЗ — табличка, экзамен — фасад храма.
  этапы урока по `step.stage` (`stage-N`), части ДЗ по `part` (`hw-N`), экзамен (`exam`).
- **Ответвления:** `lessonBranches(lesson)` — те же `LessonStage` с `section: 'branch'`, `parent`
  (id этапа) и `n` = номер этапа. На карте — пунктир в сторону от этапа (туда, где нет соседней
  точки), в `LessonPath` их шаги идут после основного пути; конец ответвления — снова карта.
  В прогресс этапов, медальоны и экзамен не входят. Греческое из `story` (примеры и слова) —
  в `lexicon:check` и `pnpm audio`.
- `/lesson/:id` **без `?step`** — карта урока (`widgets/lesson-map`): дорожка-змейка (SVG за
  абсолютно позиционированными точками), медальоны `Medallion` из `shared/ui/ornament`,
  кнопка «Дальше: <этап>», финал урока и «Пройти заново». Клик по этапу → первый непройденный
  шаг этапа (`stageEntryStep`).
- С `?step=<id>` — `LessonPath`: в сайдбаре только шаги текущего этапа и ссылка «Карта урока».
  Последний шаг этапа ведёт на карту (шаг отмечается, текущий шаг не двигается — иначе он
  перезаписал бы адрес поверх перехода на карту). Если раньше есть непройденный этап —
  подсказка «Лучше по порядку» (мягкий порядок).
- Текущий шаг всегда в адресе `?step=<id>` (`openStepId` ↔ `onStepChange`): переход по шагам добавляет запись в историю, «назад» возвращает к прошлому шагу; старое `?mode=homework` → первый шаг ДЗ.
  `?mode=reference&tab=grammar|verbs|reading|words|topic|drill` — справочник (ссылка
  «Справочник урока» в сайдбаре).

### Прогресс — `features/lesson-progress`

- Ключ: `progressKey.lesson(id)` = `verbs-first:lesson:<id>` — один на весь путь.
  Значение `{ completed: string[], current?: string }`. Старый отдельный прогресс ДЗ
  (`verbs-first:homework:<id>`) вливается при чтении и удаляется при записи.
- Все шаги открыты (свободная навигация). Шаги из `GOAL_KINDS` не засчитываются,
  если их пропустили кнопкой «дальше».
- Прогресс пишется в хранилище сразу в `setState`, а не в эффекте: после шага ученик тут же
  уходит на карту, и компонент размонтируется раньше эффекта.
- Этап пройден, когда пройдены все его шаги (`isStageDone`); экзамен засчитан, только если
  сдан (`doneWithExam`). Показанные медальоны — `verbs-first:awards-seen:<id>`: новые
  (полученные, но не показанные) карта анимирует один раз.
- Урок 0 — тот же `useLessonProgress` с ключом `progressKey.reading` (`verbs-first:reading`);
  медальоны — `verbs-first:awards-seen:alphabet`, экзамен — `verbs-first:exam:alphabet`.
  Старый ключ ДЗ вливается только у ключей уроков (`verbs-first:lesson:*`).
- Прочие ключи `localStorage`: `verbs-first:theme`, `verbs-first:greek-keyboard`,
  `verbs-first:cards:v1`, `verbs-first:cards:settings`, `verbs-first:alphabet-order:best`,
  `verbs-first:exam:<lessonId|alphabet>` (`{ best, passed }`),
  `verbs-first:composition:<lessonId>[:<stepId>]` (черновики).
- Все обращения к `localStorage` — в `try/catch`: в приватном режиме он может бросать.

### Карточки — `entities/card` + `features/card-*` + `pages/cards`

Независимый сервис слов, связанный с уроками через **наборы** (`Deck`).

- Хранилище `entities/card/model/store.ts`: `localStorage` (`verbs-first:cards:v1` =
  `{ decks, cards, days }`) + `useSyncExternalStore` (`useCards()`), синхронизация между вкладками
  через событие `storage`. Действия: `addCards`, `ensureDeck`, `createDeck`, `removeDeck`,
  `removeCard`, `recordAnswer`, `updateCard`, `renameDeck`. При появлении бэкенда меняется только этот файл.
- **Одно слово = одна карточка, наборов может быть несколько** (`Card.deckIds`). Ключ слова —
  `stripAccents(greek)`; `addCards` для уже известного слова не создаёт дубль, а добавляет набор
  в `deckIds`. Прогресс общий, поэтому при выборе нескольких наборов слово в тренировке одно
  (`cardsInDecks`). `removeFromDeck` / `removeDeck` убирают набор у слова; карточка удаляется,
  только когда наборов у неё не осталось. Старый формат (`deckId`) мигрируется при загрузке.
- Наборы урока создаются при первом добавлении: id `lesson-<N>-<groupId>`, название
  «Урок N · Группа», поле `lessonId`. Группы урока собирает `features/card-add/lib/lessonWordGroups.ts`:
  «Глаголы» (из `verbIds`/`coreVerbIds`) + `lesson.vocabulary` + фразы `topic.phrases`.
  Свой набор по умолчанию — `my-words` («Мои слова»), его нельзя удалить.
- **Словарь сайта** (`features/card-add/lib/lexicon.ts`): собирается один раз из
  `lesson.vocabulary`, `entities/dictionary` (ручной словарь: словарная форма + явные `forms`),
  фраз темы, примеров алфавита и словариков текстов (`glossary` — только как подсказка значения).
  `lookupToken(token)` → словарная форма: глагол через `createAnalyzer` → `lemma`; иначе по
  ключу `stripAccents`. Форма из текста в карточку не кладётся. `pnpm lexicon:check`
  (`scripts/lexicon-coverage.ts`) показывает слова сайта без словарной формы. `pnpm audio`
  озвучивает и отдельные слова фраз (кроме однобуквенных).
- `Phrase` (через `wordIn`) режет фразу на слова-кнопки (`Word` с `display` = форма в тексте и
  `phrase` = вся фраза); `TokenCard` — то же для панели разбора в `ReadingView`
  (слот `renderAdd(token)`). Отдельное слово урока (`lessonWordDeck`): глагол → «Урок N · Глаголы», слово из
  `vocabulary` → набор своей группы («Существительные», «Связки и наречия»), прочее → «Другие слова».
  Названия наборов урока синхронизируются с данными (`ensureDeck`).
- **Экзамены** — `features/exam`: общий `Exam` (id, title, build, rules) со строгими правилами,
  результат `verbs-first:exam:<id>` (`id` — номер урока или `alphabet`). Наборы заданий:
  `buildAlphabetExam()` (из `SOUND_QUIZ`, `WORD_QUIZ`, `MARKS_QUIZ`, порядка `LETTERS`) и
  `buildLessonExam(lesson)` — собирает задания из данных
  урока (глаголы → `buildRussian`/`buildGreek`, фразы translate/dictation/oral из шагов и ДЗ
  без повторов с таблицей, `vocabulary`, `readings[].questions`); засчитывается только
  `correct` (ударение обязательно). Шаг `kind: 'exam'` (последний в `steps`) рендерит
  `StepContent`; сдал — `onPassed` → шаг засчитан (`GOAL_KINDS`); отметка шага экзамена всегда сверяется с `readExamResult`, «Завершить» на несданном экзамене недоступна. Слова из ошибок — слот
  `renderWords` → `AddWords` (`features/card-add`). Ссылка на шаг: `?step=<id>`.
- **Любое слово — в карточки.** `features/card-add` даёт `Word` (слово-кнопка с пунктиром →
  всплывающее окно: перевод, озвучка, «+ В карточки» или «✓ В наборе «…»» через `findCard`),
  `wordIn(deck)` (рендер-функция для слотов) и `AddToCards` (только кнопка, для готовых
  панелей вроде разбора слова в тексте). `AddToCards` показывает до 3 быстрых кнопок: набор
  места + наборы слова + недавние (`Deck.usedAt`, ставит `addCards`; `recentDecks`) + «Мои
  слова»; «Все наборы и новый…» — галочки по всем наборам и создание нового. Наборы урока — `lessonDecks(lesson)`: `verbs`,
  `text`, `phrases`, `examples`; алфавит — набор `alphabet`. Entities и виджеты не знают о
  карточках: у них слоты `renderGreek` (`PhraseList`, `GrammarSectionView`,
  `CompositionEditor`), `renderWord` (`LetterGrid`, `CombinationList`, `VerbAlgorithm`),
  `renderAdd` (`ReadingView`); заполняют их страницы и `StepContent`. В упражнениях
  (тренажёры, карточки) слова не кликабельны, чтобы не подсказывать.
- Прогресс (`lib/srs.ts`, коробки Лейтнера **с датами**): у каждой карточки **два** независимых
  прогресса — `ru-gr` (вспомнить греческое) и `gr-ru` (понять греческое). `schedule`: верно →
  коробка +1 (до 5), ошибка → 0; `due` = начало дня через `INTERVAL_DAYS[box]` = 0, 1, 2, 4, 8, 16
  календарных дней (`addDays`, без проблем с переводом часов). `isDue` — уже видели и срок наступил
  (старые карточки без `due` — пора). «Выучено» — коробка ≥ 3.
  `planToday` — к повторению (по сроку, затем коробке) + до `NEW_PER_SESSION` (8) новых;
  `pickSession` — до `SESSION_LIMIT` (20); `pickPractice` — самые слабые, когда на сегодня всё;
  `nextReview` — ближайший срок. В прогресс идёт только **первая** попытка в сессии; ошибочная
  карточка возвращается через 2 карточки, `useSession` отдаёт `missed` для экрана итога.
- Серия дней: `CardsState.days` (ключи `YYYY-MM-DD`, последние 400) пополняет `recordAnswer`;
  `streakOf(days)` — дни подряд, заканчивая сегодня или вчера. `updateCard`, `renameDeck` (только свои наборы).
- Тренировка = режим (`features/card-training/model/settings.ts`, `MODES`): `flip` (ru + self,
  `FlipCard`: Пробел/Enter — перевернуть, 1/2 — ответ), `recall` (ru + choose), `recognize`
  (gr + choose), `listen` (audio + choose), `write` (ru + write); в выборе из 4 — клавиши 1–4.
  Режим — `verbs-first:cards:mode` (старые `…:settings` мигрируются).
- `pages/cards`: «Сегодня» (`CardTrainer`: план → сессия → итог) и наборы плитками по урокам;
  `?deck=<id>` — `DeckView` (тренировка набора, слова со статусом, правка, удаление);
  `?lesson=N` — «Сегодня» только по наборам урока.
- Проверка (`lib/answers.ts`): греческий через `compareAnswer` с вариантами (через `/`,
  артикль `ο/η/το…` необязателен); русский — любое из значений через `,`/`;`, скобки
  игнорируются, одна опечатка в слове от 5 букв — «почти».
- Озвучка своих слов: mp3 нет, работает греческий голос браузера (если есть).

### Тексты — `entities/library` + `pages/texts`

- `LibraryText` = `ReadingText` урока + `level` (после какого урока по силам; 0 — после алфавита), `genre`,
  `summary`. Свои тексты — `entities/library/data/texts.ts`: уровень 1 — только глаголы урока 1, уровень 2 —
  уроков 1–2 и έχω; прочие слова — в словаре (`dictionary/data/library-words.ts`). Факты — только проверенные.
- `pages/texts/lib/catalog.ts` собирает раздел: тексты курса чтения (шаги `text`), свои тексты и тексты уроков —
  без копирования данных. Уровень — рекомендация, не замок.
- «Знакомо N%» (`lib/known.ts`): доля слов текста (подряд, без имён), чья словарная форма встречалась в
  начатых уроках (весь их греческий) или учится в карточках. Подсветка незнакомых — проп `markUnknown`
  у `ReadingView`; «Новые слова текста — в карточки» — набор «Из текстов».
- «Прочитано» — `verbs-first:texts:read`. Новые тексты входят в `pnpm lexicon:check` и `pnpm audio`.

### История — `entities/story` + `pages/story`

- Сериал по главам (сюжет и формат — `docs/story/`): `StoryChapter` = текст (`sentences`), шаги, конспект, крючок.
  Глава `lesson` = N: глаголы и грамматика — только из уроков 1…N.
- `StoryStep`: кусок текста `sentences: [от, до]` (номера с 1), объяснение `body` с разметкой (`**жирный**`,
  `` `фрагмент` `` — окончание/основа без перевода; прочий греческий сам становится словами — `GreekInline`
  из `features/card-add`), задача `task`: `gap` (пропуск в тексте; `options` — выбор вместо ввода),
  `tap` (нажать слова в куске), `choose` (`audio` — на слух, кусок скрыт до ответа).
- Экран шага: сверху номера всех шагов (любой открывается сразу, пройденные отмечены), слева объяснение
  и задача (закреплены), справа вся глава — текущий кусок обычным цветом с чертой на полях, остальное приглушено.
  Чтобы текст не выдавал ответы, пропуски непройденных шагов пустые, реплики заданий на слух размыты до ответа.
  Пропуски и выбор слов в тексте — через `renderToken` у `Phrase`. На телефоне — только текущий кусок
  («Весь текст главы» по кнопке) и закреплённая навигация внизу.
- `/story` — 3D-карта острова на весь экран под шапкой, без прокрутки и без подвала (`useMatch` в `Layout`) (`pages/story/ui/IslandMap`, сцена — `lib/island-scene.ts` на three.js,
  грузится отдельным чанком только здесь). Рельеф — `lib/terrain.ts`: форма острова из пятен суши и заливов с искажением
  шумом (изрезанный берег, лагуна за косой), хребты, посёлки (`SETTLEMENTS`), поля вокруг деревень, леса, дороги (`ROADS`);
  считается один раз на сетке 2×2, дно — по карте расстояний до берега. Цвет земли — в шейдере (`onBeforeCompile`) по высоте,
  уклону и маскам: вода по глубине, прибой, пляжи, поля лоскутами, лес, скалы. Дома, церкви и деревья — инстансы.
  Камера перспективная: старт — приближенно у места, где сейчас Анна; карту тащат мышью/пальцем, масштаб — колесо
  или щипок (кнопок масштаба нет); рендер только при изменениях. Места глав — HTML-медальоны (`Medallion`, как на карте урока) поверх
  холста, положение пересчитывается после каждого кадра; закрытые места — «?». Тропа — пройденная часть и один отрезок
  к следующему месту. Места глав на берегу должны стоять у воды нового берега (`STORY_PLACES`). Цвета — `--map-*`
  в `global.css`. Поверх карты слева — картуш с заголовком (пергамент, меандр, кнопка «Находки») и под ним карточка
  главы с иллюстрацией места (`image` у главы, файл в `public/story/`, промпты — `docs/story/illustrations.md`;
  нет файла — карточка без картинки). Карточка закрывается (× или Esc), ужимается по высоте колонки (картинка ниже,
  вступление — 3 строки) и не прокручивается; на её месте открываются и «Находки». На телефоне карточка — снизу
  (не выше ⅔ карты), открывается нажатием на место; камера ставит место над карточкой. Картуш сворачивается
  в табличку «История ▾» + «Находки» (на телефоне развёрнут при первом входе, потом свёрнут — `verbs-first:story-intro-seen`; сворачивается
  и при выборе места; на широком экране — развёрнут).
  Без WebGL — плоская SVG-карта (`StoryMap` + `IslandArt`, упрощённый берег).
- Прогресс — `verbs-first:story` (`{ [глава]: id шагов }`, `end` — вся глава). Слова глав — `dictionary/data/story-words.ts`,
  набор карточек «Из истории». Главы входят в `pnpm lexicon:check` (вместе с греческим из объяснений) и `pnpm audio`.

### Алфавит — `entities/alphabet` + `features/alphabet-quiz` + `pages/alphabet`

- **Курс чтения** `READING_COURSE` (`entities/alphabet/data/course.ts`) — тип `Course`
  из `entities/lesson` (этапы, шаги, ответвления, `examAward`, без ДЗ); `lessonStages`/
  `lessonBranches` принимают и урок, и курс, карта и путь — те же `LessonMap`/`LessonPath`.
  Шаги курса — виды `letters`, `syllables`, `ladder`, `choice` (`listen` — «услышь и выбери»),
  `build`, `text` (`look`: записка/открытка/объявление/табличка), `order`, `rules` в общем `LessonStep`; рисует их `pages/alphabet/ui/ReadingStep`.
  Неверные варианты «услышь и выбери» и «как читается» — ближайшие по написанию слова
  (`listenItems`, `readItems`). `pnpm reading:check` — в словах этапа только пройденные
  буквы и сочетания (ударение на первой гласной и διαλυτικά разбивают пару).

- Данные: `LETTERS` (24 буквы: название по-гречески и по-русски, звук, пояснение, пример
  с чтением русскими буквами), `COMBINATIONS` (αι, ει/οι, ου, αυ/ευ, μπ, ντ, γκ/γγ, τσ/τζ,
  γ+ε/ι, σ+звонкая, ια/ιο, двойные согласные), `SOUND_QUIZ` (строится из букв и сочетаний),
  `WORD_QUIZ` (слова с **ручными** неверными вариантами — типичными ошибками чтения).
- Чтение пишется русскими буквами с ударением (знак ́); звуков θ, ð, γ нет в русском —
  в чтении они записаны греческими буквами и объяснены в пояснении к букве.
- `ChoiceQuiz`: озвучка показывается **только после ответа** (иначе подсказывает).
- Озвучиваются названия букв, примеры и слова `WORD_QUIZ` (`pnpm audio`).
  Слова из `lesson.vocabulary` озвучиваются заранее (`pnpm audio`).

### Проверка ответов — `shared/lib/greek`

`compareAnswer(answer, accepted) → 'correct' | 'accent' | 'wrong'`:
нормализация (регистр, `ς→σ`, пунктуация), необязательное местоимение-подлежащее
в начале (и в ответе, и в эталоне), ошибка только в ударении → `accent` (засчитывается,
но подсвечивается — «свобода прежде правильности»).

### Тренажёры

- `conjugation-drill`: случайная ячейка из `scope`, очередь повторов (ошибка возвращается
  через `RETRY_GAP = 3` задания), цель `goal`. Начальная форма глагола скрыта до кнопки
  «Подсказка» — ученик должен вспомнить глагол сам.
- `sentence-trainer`: очередь фраз (`useQueue`), каждую нужно решить один раз,
  ошибочная возвращается через 2 задания. Режимы: `translate`, `dictation` (автопроигрывание),
  `oral` (показать ответ → «сказал верно» / «повторить позже»).

### Озвучка

```
scripts/generate-audio.ts   собирает все греческие тексты с кнопкой озвучки (формы глаголов
                            во всех 81 ячейке, примеры, фразы, тексты, фразы ДЗ) → mp3
scripts/edge_tts_batch.py   синтез через edge-tts (Python, .venv), последовательно, с ретраями
public/audio/<sha1>.mp3     имя = sha1(голос|скорость|текст)[:16]
public/audio/manifest.json  { "нормализованный текст": "файл.mp3" }
```

- Голос `el-GR-NestorasNeural`, скорость `-10%` (`TTS_VOICE`, `TTS_RATE`).
  `el-GR-AthinaNeural` на бесплатном доступе часто отдаёт пустой звук — не использовать.
- В рантайме `speak(text)` (`shared/lib/speech`) нормализует текст (`speechText`),
  ищет файл в манифесте, иначе говорит **только греческим** голосом браузера; если его нет —
  возвращает `false` и кнопка показывает перечёркнутый динамик. Не греческим голосом не
  говорим никогда (он учит неправильному произношению).
- После добавления любого греческого текста в контент: `pnpm audio`, затем закоммитить
  новые mp3 и `manifest.json`. Скрипт удаляет устаревшие mp3 только если не было ошибок.
- edge-tts — **неофициальный** доступ. Для продакшена заменить `synthesize()` в скрипте
  на Azure Speech (тот же голос).
- Скрипты импортируют слайсы **глубоко** (`@/entities/lesson/api/lessonApi`), а не через
  `index.ts`, чтобы не тянуть React и CSS в Node.

### Базовый путь (GitHub Pages)

Сайт живёт на `https://ryabv.github.io/verbs-first/`. Переменная окружения `BASE_URL`
(по умолчанию `/`) при сборке попадает в:
`output.publicPath`, `process.env.BASE_URL` (DefinePlugin) → `basename` роутера и адрес
аудио. Никогда не пишите абсолютные пути вида `'/audio/…'` — используйте
`process.env.BASE_URL` или `routes.*`. Для прямых ссылок на SPA собирается копия
`index.html` как `404.html`.

## UI и стили

- Визуальный стиль — в духе учебника learn.javascript.ru: серый сайдбар 249px, колонка статьи
  до 800px, 18px текст статей, `Callout`, большие `PrevNext`, хлебные крошки.
- Все цвета и размеры — CSS-переменные в `src/app/styles/global.css`; тёмная тема —
  `:root[data-theme='dark']` (переключатель ставит атрибут на `<html>`). Не хардкодить цвета.
- CSS Modules (`*.module.css`, default import). Глобальные классы — только в `global.css`.
- Адаптивность: `@media (max-width: 900px)` — сайдбар уходит наверх, список шагов
  сворачивается в плашку; `@container` — таблица глаголов и `VerbAlgorithm` подстраиваются
  под ширину своего контейнера; `@media (pointer: coarse)` — крупнее цели для пальца.
- Мобильный ввод: экранная греческая клавиатура (`useGreekKeyboard`) на тач-устройствах
  свёрнута по умолчанию; когда открыта — у поля `inputMode="none"`, чтобы не было двух
  клавиатур. Кнопки клавиатуры и «Проверить» делают `preventDefault` на `mousedown`,
  чтобы поле не теряло фокус.
- Иконки — inline SVG в `shared/ui/icon` (`currentColor`), не эмодзи.
- Греческие мотивы — `shared/ui/ornament`: `Laurel`/`Wreath` (венок — только награда),
  `Amphora`, `Owl` (значок ответвлений), `Column`, `Meander` (полоса-маска, цвет `--meander`), `Check` (галочка-мазок) и `Arrow`
  (стрела-копьё) — вместо символов ✓ ← → в интерфейсе.
- Полоса прогресса — одна на всё приложение: `shared/ui/progress-bar` (`ProgressBar value={0…1}`,
  `thin` для сайдбара): «бегущая волна», бледный узор заполняется оливковым. Цвета — `--olive`, `--brand`.
  Шрифт крупных заголовков `--font-display` (Alegreya, Google Fonts в `public/index.html`).

## Деплой

`.github/workflows/deploy.yml`: `pnpm install --frozen-lockfile` → `typecheck` →
`build` с `BASE_URL=/<repo>/` → `actions/deploy-pages`. Особенности pnpm 12:
версия закреплена в `packageManager`, build-скрипты зависимостей запрещены явно в
`pnpm-workspace.yaml` (`allowBuilds`) — иначе install в CI падает с `ERR_PNPM_IGNORED_BUILDS`.
После изменения зависимостей обязательно коммитить обновлённый `pnpm-lock.yaml`.

## PWA

Сайт ставится на телефон и компьютер как приложение и открывается без сети.
- `public/manifest.webmanifest` — имя, цвета, `start_url`/`scope` относительные (`./`), поэтому
  работают под `/verbs-first/`. Ссылки на манифест и `apple-touch-icon` в `public/index.html`
  собираются через `<%= BASE_URL %>` (`templateParameters` в `rspack.config.ts`).
- Иконки — `public/icons/`: исходники `icon.svg` и `icon-maskable.svg` (ρ в венке; у maskable
  запас по краям под обрезку Android), PNG 192/512/180 — растр из них.
- `public/sw.js` — service worker, регистрируется в `src/app/index.tsx` только в продакшене.
  Страницы, `main.js`/`main.css` (без хэша в имени) и манифест озвучки — сначала сеть, без сети —
  кэш; любая страница офлайн — оболочка `index.html`. mp3 — сначала кэш (имя = хэш текста).
  Поменяли логику кэширования — поднять `VERSION` в `sw.js`: старый кэш удалится при активации.

## Технический долг и ограничения

- Нет тестов. Логику (`compareAnswer`, `buildGreek`, `createAnalyzer`, `useQueue`)
  проверяли разовыми `tsx`-скриптами — стоит оформить в unit-тесты.
- Кросс-импорт `features/pronounce` из других фич (см. выше).
- Нет бэкенда: прогресс не синхронизируется между устройствами, сочинения проверяются
  только по формам глаголов урока.
- Наполнен только урок 1 (+ ДЗ). Уроки 2–16 есть в оглавлении как «скоро».
- Сборка предупреждает о размере бандла (~500 КБ, контент уроков в JS). Когда уроков станет больше — грузить уроки через `import()`.
