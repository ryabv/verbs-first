/**
 * Проверка глав «Истории»: устройство главы, задания, «ответ не виден в объяснении», глаголы — только из пройденного.
 * Запуск: pnpm story:check. Ошибки — код выхода 1; замечания (стоит посмотреть) — печатаются, но не валят проверку.
 * Правила — docs/story/README.md и docs/product/tasks.md; реестр типов — entities/story/model/tasks.ts.
 */
import { getLesson, getLessonCatalog } from '@/entities/lesson';
import { PRACTICE_KINDS, STORY_CHAPTERS, STORY_PLACES, WEEK_MATERIAL, type StoryChapter } from '@/entities/story';
import { analyzePhrase, lookupToken } from '@/features/card-add/lib/lexicon';
import { MAP_H, MAP_W } from '@/pages/story/lib/cyprus';

const errors: string[] = [];
const notes: string[] = [];

/** Урок, в котором глагол впервые появился: id глагола → номер урока. */
const verbLesson = new Map<string, number>();
for (const { id, available } of getLessonCatalog()) {
  const lesson = available ? getLesson(id) : undefined;
  if (!lesson) continue;
  for (const v of [...lesson.coreVerbIds, ...lesson.verbIds]) if (!verbLesson.has(v)) verbLesson.set(v, id);
}
/** Глаголы-выражения, которые урок даёт целиком, без спряжения: «Με λένε» — «меня зовут» (урок 1). */
const SET_PHRASE_VERBS = new Set(['λένε', 'λέτε', 'αρέσει']);
const RUSSIAN_VERB = /^(\S+(ть|ться|чь|чься|сти|стись))\b/;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[«»"“”.,;:!?—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const wordsOf = (greek: string) => analyzePhrase(greek).filter((t) => t.isWord);
const inRange = (c: StoryChapter, [a, b]: readonly [number, number]) => a >= 1 && b >= a && b <= c.sentences.length;
const unique = (list: readonly string[]) => new Set(list).size === list.length;

function checkChapter(c: StoryChapter, index: number) {
  const at = (what: string) => `Глава ${c.id}: ${what}`;
  const err = (what: string) => errors.push(at(what));
  const note = (what: string) => notes.push(at(what));

  // Сетка: главы по порядку, глава 2k−1 и 2k — урок k, 4 главы — эпоха.
  if (c.id !== index + 1) err(`номер ${c.id}, а по порядку должен быть ${index + 1}`);
  if (c.lesson !== Math.ceil(c.id / 2)) err(`урок ${c.lesson}, а должен быть ${Math.ceil(c.id / 2)}`);
  if (c.epoch !== Math.ceil(c.id / 4)) err(`эпоха ${c.epoch}, а должна быть ${Math.ceil(c.id / 4)}`);
  if (c.sentences.length < 15 || c.sentences.length > 25) note(`${c.sentences.length} предложений (по плану 15–25)`);
  if (!STORY_PLACES.some((p) => p.chapter === c.id)) err('нет места на карте (entities/story/data/map.ts)');

  // Шаги: куски идут подряд и покрывают всю главу.
  if (!unique(c.steps.map((s) => s.id))) err('повторяются id шагов');
  let next = 1;
  for (const s of c.steps) {
    if (!inRange(c, s.sentences)) err(`шаг ${s.id}: куски ${s.sentences.join('–')} вне главы`);
    else if (s.sentences[0] !== next) err(`шаг ${s.id}: начинается с ${s.sentences[0]}, а ждём ${next} (куски должны идти подряд)`);
    next = s.sentences[1] + 1;
    const check = s.check;
    if (!check) continue;
    if (check.answer < 0 || check.answer >= check.options.length) err(`шаг ${s.id}: номер ответа вне вариантов`);
    if (!unique(check.options)) err(`шаг ${s.id}: повторяются варианты вопроса`);
    // Ответ не должен быть просто написан в объяснении.
    const right = norm(check.options[check.answer] ?? '');
    if (right.length > 2 && norm(s.body.join(' ')).includes(right)) err(`шаг ${s.id}: ответ «${check.options[check.answer]}» виден в объяснении`);
  }
  if (next !== c.sentences.length + 1) err(`шаги кончаются на ${next - 1}, а предложений ${c.sentences.length}`);
  const checks = c.steps.filter((s) => s.check).length;
  if (checks < c.steps.length / 4) note(`вопросов на понимание мало: ${checks} из ${c.steps.length} шагов`);

  // Закрепление.
  if (!unique(c.practice.map((t) => t.id))) err('повторяются id заданий (по ним хранится прогресс)');
  if (c.practice.length < 8 || c.practice.length > 12) note(`${c.practice.length} заданий (по плану 8–12)`);
  const skills = new Set(c.practice.map((t) => PRACTICE_KINDS[t.kind].skill));
  for (const skill of ['reading', 'listening', 'writing'] as const) if (!skills.has(skill)) err(`в закреплении нет навыка «${skill}»`);
  for (const t of c.practice) {
    const task = (what: string) => err(`задание ${t.id}: ${what}`);
    switch (t.kind) {
      case 'gap': {
        const sentence = c.sentences[t.sentence - 1];
        if (!sentence) task(`предложения ${t.sentence} нет`);
        else if (!wordsOf(sentence.greek).some((w) => w.text === t.word)) task(`слова «${t.word}» нет в предложении ${t.sentence}`);
        if (!t.options.includes(t.word)) task('среди вариантов нет верного слова');
        if (!unique(t.options)) task('повторяются варианты');
        break;
      }
      case 'tap': {
        if (!inRange(c, t.sentences)) task('кусок вне главы');
        else {
          const words = new Set(c.sentences.slice(t.sentences[0] - 1, t.sentences[1]).flatMap((s) => wordsOf(s.greek).map((w) => w.text)));
          for (const w of t.answer) if (!words.has(w)) task(`слова «${w}» нет в куске ${t.sentences.join('–')}`);
        }
        break;
      }
      case 'choose':
        if (t.answer < 0 || t.answer >= t.options.length) task('номер ответа вне вариантов');
        if (t.sentences && !inRange(c, t.sentences)) task('кусок вне главы');
        if (!unique(t.options)) task('повторяются варианты');
        break;
      case 'listen':
        if (t.options[t.answer] !== t.audio) task('озвучка не совпадает с верным вариантом');
        if (t.options.length !== t.meanings.length) task('вариантов написания и смысла разное число');
        if (!unique(t.options) || !unique(t.meanings)) task('повторяются варианты');
        break;
      case 'translate': {
        if (!t.greek.length) task('нет греческого перевода');
        const tiles = new Set(wordsOf(t.greek[0] ?? '').map((w) => w.text.toLowerCase()));
        for (const d of t.decoys) if (tiles.has(d.toLowerCase())) task(`лишняя плитка «${d}» есть и во фразе`);
        break;
      }
    }
  }

  // Рассказы кота: привязаны к шагу, метка на карте.
  for (const b of c.branches ?? []) {
    if (!c.steps.some((s) => s.id === b.after)) err(`рассказ ${b.id}: шага ${b.after} нет`);
    if (b.x < 0 || b.x > MAP_W || b.y < 0 || b.y > MAP_H) err(`рассказ ${b.id}: метка вне карты`);
  }
  if (!unique((c.branches ?? []).map((b) => b.id))) err('повторяются id рассказов кота');

  // Глаголы — только из пройденных уроков (матрица: глава N опирается на главы 1…N).
  checkVerbs(c.lesson, err, [
    ...c.sentences.map((s) => s.greek),
    ...c.practice.flatMap((t) => (t.kind === 'translate' ? t.greek : t.kind === 'listen' ? t.options : [])),
    ...(c.branches ?? []).flatMap((b) => (b.examples ?? []).map((e) => e.greek)),
  ]);

  // Материал недели: есть у каждой главы, 2–3 текста с вопросами, 20–30 предложений, глаголы — пройденные.
  const week = WEEK_MATERIAL.find((w) => w.chapter === c.id);
  if (!week) {
    note('нет материала недели (entities/story/data/week-material.ts)');
    return;
  }
  const weekErr = (what: string) => err(`материал недели: ${what}`);
  if (week.texts.length < 2 || week.texts.length > 3) weekErr(`${week.texts.length} текстов (нужно 2–3)`);
  if (week.sentences.length < 20 || week.sentences.length > 30) weekErr(`${week.sentences.length} предложений (нужно 20–30)`);
  if (!unique(week.texts.map((t) => t.id))) weekErr('повторяются id текстов');
  for (const t of week.texts) {
    if (!t.questions.length) weekErr(`у текста ${t.id} нет вопросов`);
    for (const q of t.questions) if (q.answer < 0 || q.answer >= q.options.length) weekErr(`текст ${t.id}: номер ответа вне вариантов`);
  }
  checkVerbs(c.lesson, weekErr, [...week.texts.flatMap((t) => t.sentences), ...week.sentences].map((s) => s.greek));
}

/** Глаголы во фразах — только из уроков не позже `lesson`. */
function checkVerbs(lesson: number, err: (what: string) => void, greek: readonly string[]) {
  const outside = new Set<string>();
  for (const text of greek) {
    for (const t of analyzePhrase(text)) {
      if (!t.isWord) continue;
      if (t.verb) {
        const from = verbLesson.get(t.verb.verb.id);
        if (from === undefined || from > lesson) outside.add(`${t.text} (${t.verb.verb.lemma}, урок ${from ?? '?'})`);
        continue;
      }
      // Глагол не из уроков (есть только в словаре): перевод — русский инфинитив.
      const entry = lookupToken(t);
      if (entry && !SET_PHRASE_VERBS.has(t.text) && RUSSIAN_VERB.test(entry.russian)) outside.add(`${t.text} (${entry.greek}, не из уроков)`);
    }
  }
  if (outside.size) err(`глаголы не из пройденного: ${[...outside].join(', ')}`);
}

STORY_CHAPTERS.forEach(checkChapter);

for (const n of notes) console.log(`замечание · ${n}`);
for (const e of errors) console.log(`ошибка · ${e}`);
console.log(`Глав: ${STORY_CHAPTERS.length}, ошибок: ${errors.length}, замечаний: ${notes.length}`);
if (errors.length) process.exit(1);
