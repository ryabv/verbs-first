import { Link } from 'react-router';
import { LetterIntroList } from '@/entities/alphabet';
import { PhraseList, type LessonStep } from '@/entities/lesson';
import { AlphabetOrder, BuildWord, ChoiceQuiz, SyllableGrid, TextReader, WordLadder } from '@/features/alphabet-quiz';
import { AddWords, wordIn } from '@/features/card-add';
import { buildAlphabetExam, Exam } from '@/features/exam';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { buttonClassName } from '@/shared/ui/button';
import { StressRules } from './StressRules';
import styles from './AlphabetPage.module.css';

/** Все слова курса чтения — в набор карточек «Алфавит». */
export const ALPHABET_DECK = { id: 'alphabet', title: 'Алфавит' };
const speak = (text: string) => <SpeakButton text={text} />;
const word = wordIn(ALPHABET_DECK);

/** Содержимое шага курса чтения. onGoal — упражнение выполнено. */
export function ReadingStep({ step, onGoal }: { step: LessonStep; onGoal: () => void }) {
  switch (step.kind) {
    case 'letters':
      return <LetterIntroList letters={step.letters} renderSpeak={speak} renderWord={word} />;
    case 'syllables':
      return <SyllableGrid rows={step.rows} />;
    case 'ladder':
      return <WordLadder words={step.words} renderWord={word} />;
    case 'text':
      return <TextReader sentences={step.sentences} look={step.look} renderWord={word} />;
    case 'choice':
      return <ChoiceQuiz items={step.items} question={step.question} listen={step.listen} onComplete={onGoal} />;
    case 'build':
      return <BuildWord words={step.words} extra={step.extra} onComplete={onGoal} />;
    case 'order':
      return <AlphabetOrder onComplete={onGoal} />;
    case 'rules':
      return <StressRules />;
    case 'story':
      return (
        <>
          {step.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {step.examples && <PhraseList phrases={step.examples} renderAction={speak} renderGreek={word} />}
          {step.words && step.words.length > 0 && (
            <section className={styles.storyWords}>
              <h2 className={styles.storyWordsTitle}>Новые слова</h2>
              <PhraseList phrases={step.words} renderAction={speak} renderGreek={word} />
              <AddWords
                words={step.words.map((w) => ({ ...w, kind: 'word' as const }))}
                deckFor={() => ALPHABET_DECK}
                label="Добавить в карточки"
                doneLabel="Слова уже в карточках"
              />
            </section>
          )}
        </>
      );
    case 'exam':
      return (
        <Exam
          id="alphabet"
          onPassed={onGoal}
          title="Экзамен по алфавиту"
          build={buildAlphabetExam}
          rules={[
            '20 вопросов по всему курсу: звуки букв и сочетаний, чтение слов, ударение и знаки, порядок букв.',
            'Озвучки по ходу нет — она подсказывает. Послушать можно в разборе.',
          ]}
          actions={
            <Link to={routes.lesson(1)} className={buttonClassName('secondary')}>
              К уроку 1
            </Link>
          }
        />
      );
    default:
      return null;
  }
}
