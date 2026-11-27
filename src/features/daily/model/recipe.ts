import { isServiceWord } from '@/entities/dictionary';
import type { PracticeTask, StoryChapter, StorySentence, WeekMaterial } from '@/entities/story';
import { RUSSIAN_PRONOUNS, TENSE_LABELS, type Person, type Tense, type TextToken } from '@/entities/verb';
import { stripAccents } from '@/shared/lib/greek';
import { seeded, seededShuffle } from '@/shared/lib/random';

/**
 * Сборка дня по рецепту (docs/product/daily.md): день не пишется руками, а собирается из уже вычитанного —
 * заданий закрепления глав и материала недели. Типы заданий — те же, что в закреплении (PRACTICE_KINDS).
 *
 * Ключ задания постоянный и сам определяет задание: варианты-ловушки выбираются по ключу, а не по дате,
 * поэтому набор дня хранится как список ключей (таблица daily_days).
 */

/** Словарь сайта — передаёт страница (он в features/card-add, а фичи не импортируют друг друга). */
export interface DailyLexicon {
  analyze(text: string): TextToken[];
  lookup(token: TextToken): { greek: string; russian: string; kind: 'verb' | 'word' } | undefined;
}

/** Группа задания — тема дня недели. */
export type DailyGroup = 'practice' | 'form' | 'listen' | 'translate' | 'word' | 'text';

export interface DailyTask {
  key: string;
  group: DailyGroup;
  /** Глава, к материалу которой задание (0 — до первой главы). */
  chapter: number;
  task: PracticeTask;
  /** Текст, на который ссылаются номера предложений задания. */
  sentences: readonly StorySentence[];
  /** Перевод под пропуском: у отдельных фраз иначе не понять лицо и время. */
  withTranslation: boolean;
  /** Фраза задания — её слова идут в карточки, если ответ пришлось показать. */
  phrase: StorySentence;
  /** Подпись источника: «Глава 3», «Глава 3 · В кофейне». */
  source: string;
}

/**
 * Части дня — по нарастающей: от узнавания к сборке фраз. На входе в день — оглавление из частей.
 * `size` — сколько заданий части, `seconds` — примерно на одно задание (для «≈ N мин» в оглавлении).
 * Вместе — около 24 заданий, минут на пять.
 */
export interface DailyPart {
  id: string;
  title: string;
  note: string;
  groups: readonly DailyGroup[];
  size: number;
  seconds: number;
}
export const DAY_PARTS: readonly DailyPart[] = [
  { id: 'word', title: 'Слова', note: 'что значит слово', groups: ['word'], size: 6, seconds: 6 },
  { id: 'listen', title: 'На слух', note: 'услышать и узнать', groups: ['listen'], size: 5, seconds: 10 },
  { id: 'form', title: 'Формы', note: 'глагол в нужной форме', groups: ['form'], size: 5, seconds: 15 },
  { id: 'translate', title: 'Перевод', note: 'собрать фразу из слов', groups: ['translate'], size: 4, seconds: 25 },
  { id: 'chapter', title: 'Текст и глава', note: 'вопросы к текстам и закрепление глав', groups: ['text', 'practice'], size: 4, seconds: 20 },
];
/** Часть дня, к которой относится задание. */
export const partOf = (t: Pick<DailyTask, 'group'>): DailyPart => DAY_PARTS.find((p) => p.groups.includes(t.group)) ?? DAY_PARTS[0]!;

/** Заданий в дне (сумма частей). */
export const DAY_SIZE = DAY_PARTS.reduce((n, p) => n + p.size, 0);

// ---------- случайность по ключу ----------

const shuffled = seededShuffle;

/** n ловушек из списка, не совпадающих с верным (по `same`). */
function decoys<T>(pool: readonly T[], right: T, n: number, seed: string, same: (a: T, b: T) => boolean): T[] {
  const out: T[] = [];
  for (const x of shuffled(pool, seed)) {
    if (out.length >= n) break;
    if (!same(x, right) && !out.some((y) => same(x, y))) out.push(x);
  }
  return out;
}

const plain = (s: string) => stripAccents(s.toLowerCase()).replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
/** Первое значение перевода: «дом; στο σπίτι — дома» → «дом». */
const firstSense = (ru: string) => ru.split(/[;(]/)[0]!.trim();
const isName = (ru: string) => /^[А-ЯЁ]/.test(ru);
const capitalize = (form: string, like: string) => (like[0] === like[0]!.toUpperCase() ? form[0]!.toUpperCase() + form.slice(1) : form);
const firstForm = (forms: string) => forms.split('/')[0]!.trim();

// ---------- пул заданий ----------

interface PoolInput {
  /** Начатые главы, по порядку. */
  chapters: readonly StoryChapter[];
  /**
   * Прочитанные предложения (номера с 1) по главам — задания берутся только из прочитанных кусков (studiedMaterial).
   * Главы нет в списке — прочитана вся.
   */
  read?: ReadonlyMap<number, ReadonlySet<number>>;
  /** Знакомые времена: ловушки «формы» — только в них. Не задано — все. */
  tenses?: ReadonlySet<Tense>;
  /** Материал недели — уже отобранный по пройденному. */
  week: readonly WeekMaterial[];
  /** Глава 1 — для новичка: её слова и «услышь слово», пока ни одна глава не прочитана. */
  first?: StoryChapter;
  lexicon: DailyLexicon;
}

/** Все задания, которые можно дать ученику: ключ → задание. */
export function buildPool({ chapters, read, tenses, week, first, lexicon }: PoolInput): Map<string, DailyTask> {
  const pool = new Map<string, DailyTask>();
  const add = (t: DailyTask) => pool.set(t.key, t);
  const words = (text: string) => lexicon.analyze(text).filter((t) => t.isWord);

  for (const c of chapters) {
    const label = `Глава ${c.id}`;
    const seen = read?.get(c.id);
    const isRead = (from: number, to = from) => !seen || Array.from({ length: to - from + 1 }, (_, i) => from + i).every((n) => seen.has(n));
    const whole = !seen || seen.size === c.sentences.length;
    // 1. Задания закрепления главы — готовые и вычитанные; из прочитанных кусков (без привязки к куску — когда глава дочитана).
    for (const task of c.practice) {
      const available =
        task.kind === 'gap'
          ? isRead(task.sentence)
          : task.kind === 'tap' || (task.kind === 'choose' && task.sentences)
            ? isRead(...task.sentences!)
            : whole;
      if (!available) continue;
      const phrase =
        task.kind === 'gap'
          ? (c.sentences[task.sentence - 1] ?? { greek: task.word, russian: task.meaning })
          : task.kind === 'translate'
            ? { greek: task.greek[0]!, russian: task.russian }
            : task.kind === 'listen'
              ? { greek: task.audio, russian: task.meanings[task.answer] ?? '' }
              : task.kind === 'tap'
                ? (c.sentences[task.sentences[0] - 1] ?? { greek: '', russian: '' })
                : { greek: '', russian: '' };
      add({ key: `p:${c.id}:${task.id}`, group: 'practice', chapter: c.id, task, sentences: c.sentences, withTranslation: false, phrase, source: label });
    }

    // 2. Слова главы: «что значит» — из прочитанного.
    addWords(pool, seen ? { ...c, sentences: c.sentences.filter((_, i) => seen.has(i + 1)) } : c, label, lexicon);

    const material = week.find((w) => w.chapter === c.id);
    if (!material) continue;

    // 3. Предложения недели: на слух, перевод, формы.
    const list = material.sentences;
    list.forEach((s, i) => {
      const base = `w:${c.id}:s:${i}`;
      const others = list.filter((_, j) => j !== i);
      const tokens = words(s.greek);

      // На слух: верная фраза и две другие той же недели.
      const wrong = decoys(others, s, 2, `${base}:listen`, (a, b) => plain(a.greek) === plain(b.greek) || a.russian === b.russian);
      if (wrong.length === 2) {
        const options = [s, ...wrong];
        add({
          key: `${base}:listen`,
          group: 'listen',
          chapter: c.id,
          task: { id: `${base}:listen`, kind: 'listen', audio: s.greek, options: options.map((o) => o.greek), meanings: options.map((o) => o.russian), answer: 0 },
          sentences: [s],
          withTranslation: false,
          phrase: s,
          source: label,
        });
      }

      // Перевод: короткие фразы (плитки на лёгком). Подсказка — словарные формы слов.
      if (tokens.length >= 2 && tokens.length <= 7) {
        const own = new Set(tokens.map((t) => plain(t.text)));
        const spare = others.flatMap((o) => words(o.greek).map((t) => t.text.toLowerCase())).filter((w) => !own.has(plain(w)));
        const hint = [
          ...new Set(
            tokens
              .map((t) => lexicon.lookup(t))
              .filter((e) => e && !isServiceWord(e))
              .map((e) => e!.greek),
          ),
        ].join(', ');
        add({
          key: `${base}:tr`,
          group: 'translate',
          chapter: c.id,
          task: {
            id: `${base}:tr`,
            kind: 'translate',
            russian: s.russian,
            greek: [s.greek],
            decoys: decoys([...new Set(spare)], '', 2, `${base}:tr`, (a, b) => plain(a) === plain(b)),
            hint,
          },
          sentences: [s],
          withTranslation: false,
          phrase: s,
          source: label,
        });
      }

      // Формы: глагол в настоящем или прошедшем (будущее с θα — нет: θα γράφω тоже верно).
      const verb = tokens.find((t) => t.verb && t.verb.tense !== 'future');
      const m = verb?.verb;
      if (verb && m) {
        const p = m.persons[0]!;
        const table = m.tense === 'present' ? m.verb.greek.present : m.verb.greek.past;
        const otherTense = m.tense === 'present' ? m.verb.greek.past : m.verb.greek.present;
        const otherPerson = ((p + (p === 2 ? 3 : 2)) % 6) as Person;
        const thirdPerson = ((otherPerson + 1 === p ? otherPerson + 2 : otherPerson + 1) % 6) as Person;
        // Другое время в ловушках — только если оно уже встречалось; иначе — другие лица того же времени.
        const otherKnown = !tenses || tenses.has(m.tense === 'present' ? 'past' : 'present');
        const candidates = [firstForm(otherKnown ? otherTense[p] : table[thirdPerson]), firstForm(table[otherPerson])].map((f) => capitalize(f, verb.text));
        const options = [verb.text, ...candidates.filter((f, j, all) => plain(f) !== plain(verb.text) && all.findIndex((g) => plain(g) === plain(f)) === j)];
        if (options.length === 3) {
          const who = m.persons.map((x) => RUSSIAN_PRONOUNS[x]).join(' или ');
          add({
            key: `${base}:form`,
            group: 'form',
            chapter: c.id,
            task: {
              id: `${base}:form`,
              kind: 'gap',
              sentence: 1,
              word: verb.text,
              hint: `${m.verb.lemma}, ${who}, ${TENSE_LABELS[m.tense].toLowerCase()}`,
              options,
              meaning: firstSense(m.verb.translation),
            },
            sentences: [s],
            withTranslation: true,
            phrase: s,
            source: label,
          });
        }
      }
    });

    // 4. Тексты недели: вопросы на понимание, текст перед глазами.
    for (const text of material.texts) {
      text.questions.forEach((q, k) => {
        const key = `w:${c.id}:t:${text.id}:q:${k}`;
        add({
          key,
          group: 'text',
          chapter: c.id,
          task: { id: key, kind: 'choose', prompt: q.prompt, options: q.options, answer: q.answer, sentences: [1, text.sentences.length] },
          sentences: text.sentences,
          withTranslation: false,
          phrase: text.sentences[0]!,
          source: `${label} · ${text.title}`,
        });
      });
    }
  }

  // Новичок: слова главы 1 — услышать и узнать написание, значение. В пуле всегда: дни новичка хранятся ключами,
  // и после первой главы они должны открываться так же; в новые дни их не берём (buildDay).
  if (first) {
    // Слова главы 1 для новичка: те, что ещё не пришли из прочитанного, — с главой 0 (только в днях новичка).
    const novice = new Map<string, DailyTask>();
    addWords(novice, first, 'Слова главы 1', lexicon);
    for (const [k, t] of novice) if (!pool.has(k)) pool.set(k, Object.assign(t, { chapter: 0 }));
    const forms = [
      ...new Map(
        first.sentences
          .flatMap((s) => words(s.greek))
          // Служебные слова (στη, της) на слух не различить — только слова от 4 букв.
          .filter((t) => [...t.text].length >= 4)
          .map((t) => [plain(t.text), t] as const),
      ).values(),
    ];
    for (const t of forms) {
      const entry = lexicon.lookup(t);
      if (!entry || isServiceWord(entry)) continue;
      const key = `a:${plain(t.text)}`;
      const wrong = decoys(forms, t, 2, key, (a, b) => plain(a.text) === plain(b.text));
      if (wrong.length < 2) continue;
      const options = [t, ...wrong];
      add({
        key,
        group: 'listen',
        chapter: 0,
        task: {
          id: key,
          kind: 'listen',
          audio: t.text,
          options: options.map((o) => o.text),
          meanings: options.map((o) => firstSense(lexicon.lookup(o)?.russian ?? '…')),
          answer: 0,
        },
        sentences: [],
        withTranslation: false,
        phrase: { greek: entry.greek, russian: entry.russian },
        source: 'Слова главы 1',
      });
    }
  }
  return pool;
}

/** «Что значит X?» — по словарным формам слов главы. */
function addWords(pool: Map<string, DailyTask>, c: StoryChapter, label: string, lexicon: DailyLexicon) {
  const entries = new Map<string, { greek: string; russian: string }>();
  for (const s of c.sentences) {
    for (const t of lexicon.analyze(s.greek)) {
      if (!t.isWord) continue;
      const e = lexicon.lookup(t);
      if (!e || isServiceWord(e) || isName(e.russian) || plain(e.greek).replace(/\s/g, '').length < 3) continue;
      if (!entries.has(e.greek)) entries.set(e.greek, { greek: e.greek, russian: firstSense(e.russian) });
    }
  }
  const list = [...entries.values()];
  for (const e of list) {
    const key = `v:${c.id}:${e.greek}`;
    const wrong = decoys(list, e, 2, key, (a, b) => a.russian === b.russian);
    if (wrong.length < 2) continue;
    const options = [e, ...wrong].map((x) => x.russian);
    pool.set(key, {
      key,
      group: 'word',
      chapter: c.id,
      task: { id: key, kind: 'choose', prompt: `Что значит «${e.greek}»?`, options, answer: 0 },
      sentences: [],
      withTranslation: false,
      phrase: e,
      source: label,
    });
  }
}

// ---------- день ----------

export interface DayInput {
  date: string;
  pool: ReadonlyMap<string, DailyTask>;
  /** Глава, которую ученик читает сейчас (последняя прочитанная): её материала в дне больше. */
  current?: number;
  /** Задания закрепления прочитанных глав, ещё не сделанные на текущем уровне (`p:…`), — идут первыми. */
  unpracticed: readonly string[];
  /** Ошибки последней недели (ключи): до двух в день. */
  mistakes: readonly string[];
  /** Задания других дней этой недели: без повторов, где хватает материала. */
  usedThisWeek: ReadonlySet<string>;
  /** Карточки ученика (id): пора повторить — по сроку; новые — по порядку добавления. Часть «Слова» — из них. */
  cards?: { due: readonly string[]; fresh: readonly string[] };
}

/** Новых слов в день: знакомство и проверка — два задания на слово. */
export const DAILY_NEW_WORDS = 2;
/** Ключи заданий-карточек: `ci:id` — знакомство, `c:id` — проверка (ступень — по прочности слова). */
export const cardKeyOf = (id: string, intro = false) => `${intro ? 'ci' : 'c'}:${id}`;
export const parseCardKey = (key: string): { id: string; intro: boolean } | undefined => {
  const m = /^(ci?):(.+)$/.exec(key);
  return m ? { id: m[2]!, intro: m[1] === 'ci' } : undefined;
};

/**
 * Часть «Слова» из карточек: сначала то, что пора повторить; осталось место — новые слова (знакомство в начале
 * части, проверка — в конце, чтобы между ними прошло несколько заданий).
 */
function cardKeys(cards: NonNullable<DayInput['cards']>, size: number): string[] {
  const fresh = cards.fresh.slice(0, Math.min(DAILY_NEW_WORDS, Math.floor(Math.max(0, size - cards.due.length) / 2)));
  const due = cards.due.slice(0, size - fresh.length * 2);
  return [...fresh.map((id) => cardKeyOf(id, true)), ...due.map((id) => cardKeyOf(id)), ...fresh.map((id) => cardKeyOf(id))];
}

/**
 * Собрать день: ключи заданий по частям (DAY_PARTS). Одна дата и тот же прогресс — тот же набор.
 * Каждая часть набирается до своего размера; не хватило материала в одной — добирают другие, чтобы день не худел.
 */
export function buildDay({ date, pool, current, unpracticed, mistakes, usedThisWeek, cards }: DayInput): string[] {
  const picked = new Map<string, string[]>(DAY_PARTS.map((p) => [p.id, []]));
  // Часть «Слова» — сначала карточки ученика (интервальные повторения); не хватило — слова глав.
  if (cards) picked.get('word')!.push(...cardKeys(cards, DAY_PARTS.find((p) => p.id === 'word')!.size));
  const has = (k: string) => [...picked.values()].some((ks) => ks.includes(k));
  const total = () => [...picked.values()].reduce((n, ks) => n + ks.length, 0);
  /** Взять задание в его часть; `force` — сверх размера части (добор). */
  const take = (k: string, force = false) => {
    const t = pool.get(k);
    if (!t || has(k) || total() >= DAY_SIZE) return false;
    const part = partOf(t);
    const keys = picked.get(part.id)!;
    if (!force && keys.length >= part.size) return false;
    keys.push(k);
    return true;
  };
  // Задания новичка (глава 0) — только пока не начата ни одна глава.
  const all = [...pool.values()].filter((t) => current === undefined || t.chapter !== 0);
  /** Свежие — сначала, повторы недели — в запас; глава «сейчас» — вдвое чаще прошлых. */
  const ordered = (tasks: readonly DailyTask[], seed: string) => {
    const fresh = tasks.filter((t) => !usedThisWeek.has(t.key));
    const used = tasks.filter((t) => usedThisWeek.has(t.key));
    const weave = (xs: readonly DailyTask[]) => {
      const now = shuffled(
        xs.filter((t) => t.chapter === current),
        `${seed}:now`,
      );
      const past = shuffled(
        xs.filter((t) => t.chapter !== current),
        `${seed}:past`,
      );
      const out: DailyTask[] = [];
      while (now.length || past.length) {
        out.push(...now.splice(0, 2), ...past.splice(0, 1));
      }
      return out;
    };
    return [...weave(fresh), ...weave(used)].map((t) => t.key);
  };

  // Сначала незакреплённое (в части «Текст и глава») и ошибки недели — в свои части.
  unpracticed.slice(0, 3).forEach((k) => take(k));
  shuffled(mistakes, `${date}:mistakes`)
    .slice(0, 3)
    .forEach((k) => take(k));
  // Остальное — каждая часть из своих групп.
  const queues = new Map(
    DAY_PARTS.map((p) => [
      p.id,
      ordered(
        all.filter((t) => p.groups.includes(t.group) && t.group !== 'practice'),
        `${date}:mix:${p.id}`,
      ),
    ]),
  );
  for (const p of DAY_PARTS) {
    for (const k of queues.get(p.id)!) if (picked.get(p.id)!.length < p.size) take(k);
  }
  // Добор: где материала не хватило, день добирают части с запасом — по одному по кругу.
  const start = Math.floor(seeded(`${date}:start`)() * DAY_PARTS.length);
  for (let round = 0; total() < DAY_SIZE && [...queues.values()].some((q) => q.some((k) => !has(k))); round++) {
    const q = queues.get(DAY_PARTS[(start + round) % DAY_PARTS.length]!.id)!;
    const k = q.find((x) => !has(x));
    if (k) take(k, true);
  }
  return DAY_PARTS.flatMap((p) => picked.get(p.id)!);
}
