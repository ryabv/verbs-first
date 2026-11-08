import type { ReactNode } from 'react';
import { GrammarSectionView, PhraseList, type Lesson, type LessonStep } from '@/entities/lesson';
import { getVerbs, type Verb } from '@/entities/verb';
import { CompositionEditor } from '@/features/composition-check';
import { ConjugationDrill } from '@/features/conjugation-drill';
import { SpeakButton } from '@/features/pronounce';
import { SentenceTrainer } from '@/features/sentence-trainer';
import { ReadingView } from '@/features/text-reading';

const speakAction = (text: string) => <SpeakButton text={text} />;

interface Props {
  lesson: Lesson;
  step: LessonStep;
  /** Упражнение выполнено (цель тренажёра, все фразы). */
  onGoal: () => void;
  renderVerbs: (verbs: Verb[]) => ReactNode;
}

export function StepContent({ lesson, step, onGoal, renderVerbs }: Props) {
  const allVerbs = getVerbs([...lesson.coreVerbIds, ...lesson.verbIds]);

  switch (step.kind) {
    case 'theory':
      return (
        <>
          {lesson.grammar
            .filter((section) => step.sectionIds.includes(section.id))
            .map((section) => (
              <GrammarSectionView key={section.id} section={section} renderPhraseAction={speakAction} />
            ))}
        </>
      );

    case 'verbs':
      return <>{renderVerbs(getVerbs(step.verbIds ?? [...lesson.coreVerbIds, ...lesson.verbIds]))}</>;

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
        <ReadingView reading={reading} verbs={allVerbs} />
      ) : null;
    }

    case 'phrases':
      return <PhraseList phrases={lesson.topic.phrases} renderAction={speakAction} />;

    case 'presentation':
      return (
        <CompositionEditor
          draftKey={`verbs-first:composition:${lesson.id}`}
          task={lesson.topic.presentation.task}
          sample={lesson.topic.presentation.sample}
          checklist={lesson.topic.presentation.checklist}
          verbs={allVerbs}
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
        />
      );

    case 'translate':
    case 'dictation':
    case 'oral':
      return <SentenceTrainer mode={step.kind} items={step.items} onComplete={onGoal} />;
  }
}
