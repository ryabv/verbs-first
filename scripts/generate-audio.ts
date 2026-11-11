/**
 * Генерация озвучки: собирает все греческие фразы уроков и синтезирует недостающие mp3.
 *
 *   pnpm audio            — догенерировать только новые фразы
 *   pnpm audio --force    — перегенерировать всё (например, после смены голоса)
 *
 * Сейчас синтез — через edge-tts (бесплатные нейроголоса Microsoft Edge, неофициально).
 * Для продакшена замените функцию synthesize() на официальный Azure Speech —
 * голос тот же (el-GR-NestorasNeural), остальной код менять не нужно.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

// Глубокие импорты (а не index.ts слайсов), чтобы не тянуть React-компоненты и CSS.
import { COMBINATIONS } from '@/entities/alphabet/data/combinations';
import { READING_COURSE } from '@/entities/alphabet/data/course';
import { syllableSpeech } from '@/entities/alphabet/lib/syllable';
import { LETTERS } from '@/entities/alphabet/data/letters';
import { WORD_QUIZ } from '@/entities/alphabet/data/quiz';
import { STRESS_EXAMPLES } from '@/entities/alphabet/data/stress';
import { DICTIONARY } from '@/entities/dictionary/data/words';
import { getLesson, getLessonCatalog } from '@/entities/lesson/api/lessonApi';
import { LIBRARY_TEXTS } from '@/entities/library/data/texts';
import { GRAMMAR_TOPICS } from '@/entities/grammar/data/topics';
import { STORY_CHAPTERS } from '@/entities/story/data/chapters';
import { gapVariants } from '@/entities/story/model/gaps';
import { buildGreek } from '@/entities/verb/lib/buildPhrase';
import { getVerbs } from '@/entities/verb/lib/getVerbs';
import { PERSONS, SENTENCE_FORMS, TENSES } from '@/entities/verb/model/types';
import { speechText } from '@/shared/lib/speech/text';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/audio');
const VOICE = process.env.TTS_VOICE ?? 'el-GR-NestorasNeural';
const RATE = process.env.TTS_RATE ?? '-10%';
const PYTHON = existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3';

/** Все тексты, у которых в интерфейсе есть кнопка 🔊. */
function collectTexts(): Set<string> {
  const texts = new Set<string>();
  const add = (text: string) => {
    const key = speechText(text);
    if (key) texts.add(key);
  };

  // Алфавит: названия букв, примеры, слова тренажёра «Как читается».
  for (const l of LETTERS) {
    add(l.speakAs ?? l.name);
    add(l.example.greek);
  }
  COMBINATIONS.forEach((c) => c.examples.forEach((e) => add(e.greek)));
  WORD_QUIZ.forEach((q) => add(q.speak ?? q.prompt));
  Object.values(STRESS_EXAMPLES).forEach((e) => add(e.greek));
  // Курс чтения (урок 0): слоги, слова этапов, примеры букв, «услышь и выбери», ответвления.
  for (const step of [...READING_COURSE.steps, ...READING_COURSE.branches.flatMap((b) => b.steps)]) {
    if (step.kind === 'letters') step.letters.forEach((l) => add(l.example.greek));
    if (step.kind === 'text') {
      step.sentences.forEach((p) => add(p.greek));
      add(step.sentences.map((p) => p.greek).join(' '));
    }
    if (step.kind === 'syllables') step.rows.flat().forEach(([greek]) => add(syllableSpeech(greek)));
    if (step.kind === 'ladder' || step.kind === 'build') step.words.forEach((w) => add(w.plain ?? w.greek));
    if (step.kind === 'choice') step.items.forEach((q) => !/[а-яё]/i.test(q.prompt) && add(q.speak ?? q.prompt));
    if (step.kind === 'story') [...(step.examples ?? []), ...(step.words ?? [])].forEach((p) => add(p.greek));
  }

  for (const { id, available } of getLessonCatalog()) {
    const lesson = available ? getLesson(id) : undefined;
    if (!lesson) continue;

    for (const verb of getVerbs([...lesson.coreVerbIds, ...lesson.verbIds])) {
      add(verb.lemma);
      for (const tense of TENSES)
        for (const form of SENTENCE_FORMS)
          for (const person of PERSONS) {
            const [shown] = buildGreek(verb, { tense, form, person });
            if (shown) add(shown);
          }
    }
    lesson.grammar.forEach((s) => s.examples?.forEach((e) => add(e.greek)));
    lesson.topic.phrases.forEach((p) => add(p.greek));
    lesson.vocabulary.forEach((g) => g.words.forEach((w) => add(w.greek)));
    lesson.topic.presentation.sample.forEach((p) => add(p.greek));
    for (const step of [...lesson.steps, ...lesson.homework, ...lesson.branches.flatMap((b) => b.steps)]) {
      if (step.kind === 'translate' || step.kind === 'dictation' || step.kind === 'oral')
        step.items.forEach((item) => item.greek[0] && add(item.greek[0]));
      if (step.kind === 'composition') step.composition.sample.forEach((p) => add(p.greek));
      if (step.kind === 'story') [...(step.examples ?? []), ...(step.words ?? [])].forEach((p) => add(p.greek));
    }
    for (const reading of lesson.readings) {
      reading.sentences.forEach((p) => add(p.greek));
      add(reading.sentences.map((p) => p.greek).join(' '));
    }
  }
  // Раздел «Тексты»: каждая фраза и текст целиком.
  for (const t of LIBRARY_TEXTS) {
    t.sentences.forEach((p) => add(p.greek));
    add(t.sentences.map((p) => p.greek).join(' '));
  }
  // Справочник: примеры к правилам.
  for (const t of GRAMMAR_TOPICS) for (const r of t.rules) r.examples?.forEach((e) => add(e.greek));
  for (const c of STORY_CHAPTERS) {
    add(c.title);
    c.sentences.forEach((p, i) => {
      add(p.greek);
      // Пока пропуск не решён, предложение звучит с паузой вместо ответа.
      gapVariants(c, i + 1).forEach(add);
    });
    add(c.sentences.map((p) => p.greek).join(' '));
    for (const s of c.steps) if (s.task?.kind === 'choose' && s.task.audio) add(s.task.audio);
  }
  // Отдельные слова: каждое слово фраз нажимается и озвучивается в окне слова.
  // Однобуквенные (ο, η) синтезатор читает как название буквы — их не озвучиваем.
  const WORD_RE = /[\p{L}\p{M}]+/gu;
  // Добавленные по ходу слова тоже обойдутся — это безвредно: слово даёт само себя.
  for (const text of texts) {
    for (const [word] of text.matchAll(WORD_RE)) if ([...word].length > 1) add(word);
  }
  DICTIONARY.forEach((e) => add(e.greek));
  return texts;
}

function fileNameFor(text: string): string {
  return `${createHash('sha1').update(`${VOICE}|${RATE}|${text}`).digest('hex').slice(0, 16)}.mp3`;
}

function hasAudio(file: string): boolean {
  return existsSync(file) && statSync(file).size > 0;
}

interface Job {
  text: string;
  out: string;
}

/**
 * Синтез пачки фраз. Сейчас — edge-tts одним Python-процессом (scripts/edge_tts_batch.py).
 * Для Azure Speech здесь будет цикл по jobs с вызовом REST API.
 */
async function synthesize(jobs: Job[], onResult: (text: string, ok: boolean, error?: string) => void): Promise<void> {
  const child = spawn(PYTHON, [path.join(ROOT, 'scripts/edge_tts_batch.py')], {
    env: { ...process.env, TTS_VOICE: VOICE, TTS_RATE: RATE },
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  child.stdin.end(JSON.stringify(jobs));
  for await (const line of createInterface({ input: child.stdout })) {
    const result = JSON.parse(line) as { text: string; ok: boolean; error?: string };
    onResult(result.text, result.ok, result.error);
  }
  await new Promise((resolve) => child.on('close', resolve));
}

async function main() {
  const force = process.argv.includes('--force');
  await mkdir(OUT_DIR, { recursive: true });

  const texts = [...collectTexts()];
  const manifest: Record<string, string> = {};
  const todo: Job[] = [];

  for (const text of texts) {
    const file = fileNameFor(text);
    manifest[text] = file;
    const out = path.join(OUT_DIR, file);
    if (force || !hasAudio(out)) todo.push({ text, out });
  }

  console.log(`Фраз: ${texts.length}, нужно сгенерировать: ${todo.length} (голос ${VOICE}, скорость ${RATE})`);

  let done = 0;
  const failed: string[] = [];
  if (todo.length) {
    await synthesize(todo, (text, ok, error) => {
      done++;
      if (!ok) {
        failed.push(text);
        console.error(`  ✗ ${text}: ${error}`);
      }
      if (done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
    });
  }

  // В манифест — только реально существующие файлы.
  for (const [text, file] of Object.entries(manifest)) {
    if (!hasAudio(path.join(OUT_DIR, file))) delete manifest[text];
  }

  // Удаляем файлы, которые больше ни к чему не относятся.
  const used = new Set(Object.values(manifest));
  const isStale = (name: string) =>
    (name.endsWith('.mp3') && !used.has(name) && !failed.length) || name.endsWith('.part');
  const stale = (await readdir(OUT_DIR)).filter(isStale);
  await Promise.all(stale.map((name) => unlink(path.join(OUT_DIR, name))));

  const sorted = Object.fromEntries(Object.entries(manifest).toSorted(([a], [b]) => a.localeCompare(b, 'el')));
  await writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(sorted, null, 1)}\n`);

  if (failed.length) {
    console.error(`Не удалось озвучить ${failed.length} фраз — запустите pnpm audio ещё раз позже, готовые файлы сохранятся.`);
    process.exitCode = 1;
  } else {
    console.log('Готово: public/audio/manifest.json');
  }
}

await main();
