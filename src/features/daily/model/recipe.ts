import type { PracticeTask, StoryChapter, StorySentence, WeekMaterial } from '@/entities/story';
import { RUSSIAN_PRONOUNS, TENSE_LABELS, type Person, type TextToken } from '@/entities/verb';
import { stripAccents } from '@/shared/lib/greek';

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

/** Заданий в дне. */
export const DAY_SIZE = 8;

// ---------- случайность по ключу ----------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Генератор с зерном (mulberry32): одно зерно — одна и та же последовательность. */
function seeded(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(xs: readonly T[], seed: string): T[] {
  const rnd = seeded(seed);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

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
const isFunctionWord = (ru: string) => /артикль|предлог|частица|союз/.test(ru);
const isName = (ru: string) => /^[А-ЯЁ]/.test(ru);
const capitalize = (form: string, like: string) => (like[0] === like[0]!.toUpperCase() ? form[0]!.toUpperCase() + form.slice(1) : form);
const firstForm = (forms: string) => forms.split('/')[0]!.trim();

// ---------- пул заданий ----------

interface PoolInput {
  /** Главы, открытые ученику для ежедневных (прочитанные), по порядку. */
  chapters: readonly StoryChapter[];
  week: readonly WeekMaterial[];
  /** Глава 1 — для новичка: её слова и «услышь слово», пока ни одна глава не прочитана. */
  first?: StoryChapter;
  lexicon: DailyLexicon;
}

/** Все задания, которые можно дать ученику: ключ → задание. */
export function buildPool({ chapters, week, first, lexicon }: PoolInput): Map<string, DailyTask> {
  const pool = new Map<string, DailyTask>();
  const add = (t: DailyTask) => pool.set(t.key, t);
  const words = (text: string) => lexicon.analyze(text).filter((t) => t.isWord);

  for (const c of chapters) {
    const label = `Глава ${c.id}`;
    // 1. Задания закрепления главы — готовые и вычитанные.
    for (const task of c.practice) {
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

    // 2. Слова главы: «что значит».
    addWords(pool, c, label, lexicon);

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
              .filter((e) => e && !isFunctionWord(e.russian))
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
        const candidates = [firstForm(otherTense[p]), firstForm(table[otherPerson])].map((f) => capitalize(f, verb.text));
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
    addWords(pool, first, 'Слова главы 1', lexicon);
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
      if (!entry || isFunctionWord(entry.russian)) continue;
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
      if (!e || isFunctionWord(e.russian) || isName(e.russian) || plain(e.greek).replace(/\s/g, '').length < 3) continue;
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
}

/** Собрать день: ключи заданий по порядку. Одна дата и тот же прогресс — тот же набор. */
export function buildDay({ date, pool, current, unpracticed, mistakes, usedThisWeek }: DayInput): string[] {
  const picked: string[] = [];
  const take = (keys: readonly string[], n: number) => {
    let left = n;
    for (const k of keys) {
      if (left <= 0 || picked.length >= DAY_SIZE) return;
      if (pool.has(k) && !picked.includes(k)) {
        picked.push(k);
        left--;
      }
    }
  };
  // Задания новичка (глава 0) — только пока не прочитана ни одна глава.
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

  // Дни равны друг другу: незакреплённое, пара ошибок недели, остальное — поровну из всех групп.
  take(unpracticed, 3);
  take(shuffled(mistakes, `${date}:mistakes`), 2);
  // Остальное — по кругу из групп: на слух, перевод, формы, слова, текст.
  const groups: DailyGroup[] = ['listen', 'translate', 'form', 'word', 'text'];
  const queues = groups.map((g) =>
    ordered(
      all.filter((t) => t.group === g),
      `${date}:mix:${g}`,
    ),
  );
  const start = Math.floor(seeded(`${date}:start`)() * groups.length);
  for (let round = 0; picked.length < DAY_SIZE && queues.some((q) => q.length); round++) {
    const q = queues[(start + round) % queues.length]!;
    const next = q.shift();
    if (next) take([next], 1);
  }
  return picked;
}
