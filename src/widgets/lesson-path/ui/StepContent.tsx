import type { ReactNode } from 'react';
import { GrammarSectionView, knownVerbIds, PhraseList, type Lesson, type LessonStep, type TableScope } from '@/entities/lesson';
import { getVerbs, type Verb } from '@/entities/verb';
import { AddWords, LessonWords, lessonDecks, lessonWordDeck, TokenCard, wordIn } from '@/features/card-add';
import { CompositionEditor } from '@/features/composition-check';
import { ConjugationDrill } from '@/features/conjugation-drill';
import { buildLessonExam, Exam, MAX_LISTENS } from '@/features/exam';
import { SpeakButton } from '@/features/pronounce';
import { SentenceTrainer } from '@/features/sentence-trainer';
import { ReadingView } from '@/features/text-reading';
import styles from './LessonPath.module.css';

const speakAction = (text: string) => <SpeakButton text={text} />;

interface Props {
  lesson: Lesson;
  step: LessonStep;
  /** Упражнение выполнено (цель тренажёра, все фразы). */
  onGoal: () => void;
  renderVerbs: (verbs: Verb[], scope?: TableScope) => ReactNode;
}

export function StepContent({ lesson, step, onGoal, renderVerbs }: Props) {
  // Тексты и сочинения опираются на всё пройденное: глаголы этого и прошлых уроков.
  const allVerbs = getVerbs(knownVerbIds(lesson));
  const decks = lessonDecks(lesson);
  const wordDeck = lessonWordDeck(lesson);
  const exampleWord = wordIn(decks.examples, wordDeck);

  switch (step.kind) {
    case 'theory':
      return (
        <>
          {lesson.grammar
            .filter((section) => step.sectionIds.includes(section.id))
            .map((section) => (
              <GrammarSectionView
                key={section.id}
                section={section}
                renderPhraseAction={speakAction}
                renderGreek={exampleWord}
              />
            ))}
        </>
      );

    case 'verbs':
      return <>{renderVerbs(getVerbs(step.verbIds ?? lesson.verbIds), step.scope)}</>;

    case 'drill':
      return (
        <ConjugationDrill
          verbs={getVerbs(step.scope.verbIds ?? lesson.verbIds)}
          tenses={step.scope.tenses}
          forms={step.scope.forms}
          goal={step.goal}
          onGoalReached={onGoal}
        />
      );

    case 'reading': {
      const reading = lesson.readings.find((r) => r.id === step.readingId);
      return reading ? (
        <ReadingView
          reading={reading}
          verbs={allVerbs}
          renderAdd={(token, glossShown) => <TokenCard token={token} deckFor={wordDeck} translationShown={glossShown} />}
        />
      ) : null;
    }

    case 'phrases':
      return (
        <PhraseList phrases={lesson.topic.phrases} renderAction={speakAction} renderGreek={wordIn(decks.phrases, wordDeck)} />
      );

    case 'presentation':
      return (
        <CompositionEditor
          draftKey={`verbs-first:composition:${lesson.id}`}
          task={lesson.topic.presentation.task}
          sample={lesson.topic.presentation.sample}
          checklist={lesson.topic.presentation.checklist}
          verbs={allVerbs}
          renderGreek={exampleWord}
        />
      );

    case 'composition':
      return (
        <CompositionEditor
          draftKey={`verbs-first:composition:${lesson.id}:${step.id}`}
          task={step.composition.task}
          sample={step.composition.sample}
          checklist={step.composition.checklist}
          verbs={allVerbs}
          renderGreek={exampleWord}
        />
      );

    case 'words':
      return <LessonWords lesson={lesson} />;

    case 'story':
      return (
        <>
          {step.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {step.examples && <PhraseList phrases={step.examples} renderAction={speakAction} renderGreek={exampleWord} />}
          {step.words && step.words.length > 0 && (
            <section className={styles.storyWords}>
              <h2 className={styles.storyWordsTitle}>Новые слова</h2>
              <PhraseList phrases={step.words} renderAction={speakAction} renderGreek={wordIn(decks.other, wordDeck)} />
              <AddWords
                words={step.words.map((w) => ({ ...w, kind: 'word' as const }))}
                deckFor={wordDeck}
                label="Добавить в карточки"
                doneLabel="Слова уже в карточках"
              />
            </section>
          )}
        </>
      );

    case 'translate':
    case 'dictation':
    case 'oral':
      return <SentenceTrainer mode={step.kind} items={step.items} onComplete={onGoal} />;

    case 'exam':
      return (
        <Exam
          id={lesson.id}
          title={`Экзамен по уроку ${lesson.id}`}
          build={() => buildLessonExam(lesson)}
          rules={[
            'Задания по всему уроку вперемешку: таблица глаголов, перевод, диктант, слова, текст.',
            'Ударение обязательно: ошибка только в ударении тоже считается ошибкой.',
            `Диктант можно прослушать не больше ${MAX_LISTENS} раз.`,
          ]}
          renderWords={(words) => (
            <AddWords words={words} deckFor={wordDeck} label="Слова из ошибок — в карточки" />
          )}
          onPassed={onGoal}
        />
      );
  }
}
