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
    lesson/               страница урока, три режима через ?mode=
  widgets/
    app-header, app-footer
    lesson-path/          «путь» по шагам: сайдбар со списком шагов, контент шага, prev/next, финал
    verb-algorithm/       список глаголов + таблица 3×3 / все лица выбранного глагола
  features/
    conjugation-drill/    тренажёр «таблицы умножения» (одна форма глагола)
    sentence-trainer/     фразы целиком: translate / dictation / oral
    text-reading/         текст: клик по слову → разбор, перевод, «найди глаголы», вопросы
    composition-check/    сочинение с чек-листом, который отмечается сам
    lesson-progress/      прогресс по шагам (localStorage)
    pronounce/            кнопка озвучки SpeakButton
    theme-switcher/       светлая/тёмная тема
  entities/
    verb/                 модель глагола, данные, сборка фраз, анализатор текста, VerbTable
    lesson/               модель урока, контент уроков, api getLesson/getLessonCatalog
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
  steps: LessonStep[];                // путь урока
  homework: LessonStep[];             // ДЗ: те же шаги с полем day
}
```

`LessonStep` — дискриминированное объединение по `kind`:

| kind | Что показывает | Данные шага | Засчитывается |
|---|---|---|---|
| `theory` | разделы `grammar` | `sectionIds` | по кнопке «дальше» |
| `verbs` | таблицы глаголов | `verbIds?` | по кнопке |
| `drill` | `ConjugationDrill` | `scope {verbIds?, tenses?, forms?}`, `goal` | только по цели |
| `reading` | `ReadingView` | `readingId` | по кнопке |
| `phrases` | фразы темы | — | по кнопке |
| `presentation` | `CompositionEditor` с `topic.presentation` | — | по кнопке |
| `translate` | `SentenceTrainer` RU → GR | `items: SentenceItem[]` | только когда все фразы решены |
| `dictation` | `SentenceTrainer` на слух | `items` | то же |
| `oral` | `SentenceTrainer` вслух + самопроверка | `items` | то же |
| `composition` | `CompositionEditor` | `composition: CompositionTask` | по кнопке |

Общие поля шага: `id`, `title`, `intro?` (реплика «преподавателя»), `day?` (группировка ДЗ).
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
entities/lesson/api/lessonApi.ts   LESSONS = { 1: lesson01 } — регистрация уроков
entities/verb/data/verbs.ts        словарь глаголов
docs/curriculum.md                 план всех 16 уроков (глаголы, грамматика, темы)
```

`lessonApi.ts` — единственное место, которое знает, что контент в бандле. Если появится
бэкенд/CMS, меняется только он; сигнатуры `getLesson` / `getLessonCatalog` остаются.

## Ключевые механизмы

### Роутинг и режимы урока

- `/` — `HomePage`, `/lesson/:lessonId` — `LessonPage`.
- Режим урока в query: без параметра — путь урока, `?mode=homework` — ДЗ,
  `?mode=reference&tab=grammar|verbs|reading|topic|drill` — справочник.
- `LessonPath` переиспользуется для урока и ДЗ: отличаются `steps`, `storageKey`,
  `stepsTitle`, `finish`. На `LessonPath` ставится `key`, чтобы при смене режима
  состояние прогресса пересоздавалось.

### Прогресс — `features/lesson-progress`

- Ключи: `progressKey.lesson(id)` = `verbs-first:lesson:<id>`,
  `progressKey.homework(id)` = `verbs-first:homework:<id>`. Значение `{ completed: string[], current?: string }`.
- Все шаги открыты (свободная навигация). Шаги из `GOAL_KINDS` не засчитываются,
  если их пропустили кнопкой «дальше».
- Прочие ключи `localStorage`: `verbs-first:theme`, `verbs-first:greek-keyboard`,
  `verbs-first:composition:<lessonId>[:<stepId>]` (черновики).
- Все обращения к `localStorage` — в `try/catch`: в приватном режиме он может бросать.

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

## Деплой

`.github/workflows/deploy.yml`: `pnpm install --frozen-lockfile` → `typecheck` →
`build` с `BASE_URL=/<repo>/` → `actions/deploy-pages`. Особенности pnpm 12:
версия закреплена в `packageManager`, build-скрипты зависимостей запрещены явно в
`pnpm-workspace.yaml` (`allowBuilds`) — иначе install в CI падает с `ERR_PNPM_IGNORED_BUILDS`.
После изменения зависимостей обязательно коммитить обновлённый `pnpm-lock.yaml`.

## Технический долг и ограничения

- Нет тестов. Логику (`compareAnswer`, `buildGreek`, `createAnalyzer`, `useQueue`)
  проверяли разовыми `tsx`-скриптами — стоит оформить в unit-тесты.
- Кросс-импорт `features/pronounce` из других фич (см. выше).
- Нет бэкенда: прогресс не синхронизируется между устройствами, сочинения проверяются
  только по формам глаголов урока.
- Наполнен только урок 1 (+ ДЗ). Уроки 2–16 есть в оглавлении как «скоро».
- Сборка выдаёт 2 предупреждения rspack о размере бандла — не критично.
