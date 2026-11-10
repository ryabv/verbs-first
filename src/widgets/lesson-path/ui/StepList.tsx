import { Fragment } from 'react';
import { sectionOf, type LessonStep, type PathSection, type StepKind } from '@/entities/lesson';
import type { StepStatus } from '@/features/lesson-progress';
import { Check } from '@/shared/ui/ornament';
import styles from './LessonPath.module.css';

export const KIND_LABELS: Record<StepKind, string> = {
  theory: 'Читаем',
  verbs: 'Смотрим',
  drill: 'Практика',
  reading: 'Текст',
  phrases: 'Фразы',
  presentation: 'Пишем и говорим',
  translate: 'Перевод',
  dictation: 'Диктант',
  oral: 'Говорим вслух',
  composition: 'Сочинение',
  words: 'Слова',
  exam: 'Экзамен',
};

/** Чип в списке шагов — только у заданий; название шага его не повторяет. */
const KIND_TAGS: Partial<Record<StepKind, string>> = {
  drill: 'практика',
  reading: 'текст',
  translate: 'перевод',
  dictation: 'диктант',
  oral: 'вслух',
  composition: 'сочинение',
  words: 'карточки',
  exam: 'экзамен',
};

const SECTION_TITLES: Record<PathSection, string> = {
  lesson: 'Урок',
  homework: 'Домашнее задание',
  exam: 'Экзамен',
};

interface Props {
  steps: LessonStep[];
  /** Названия частей домашнего задания (part 1 → [0]). */
  partTitles?: readonly string[];
  statusOf: (id: string) => StepStatus;
  onSelect: (id: string) => void;
  /** Заголовки «Урок / Домашнее задание / Экзамен» и частей ДЗ. Для списка одного этапа не нужны. */
  grouped?: boolean;
}

const NO_TITLES: readonly string[] = [];

export function StepList({ steps, partTitles = NO_TITLES, statusOf, onSelect, grouped = false }: Props) {
  return (
    <ol className={styles.steps}>
      {steps.map((step, i) => {
        const status = statusOf(step.id);
        const tag = KIND_TAGS[step.kind];
        const prev = steps[i - 1];
        const section = sectionOf(step);
        const newSection = grouped && (!prev || sectionOf(prev) !== section);
        const newPart = grouped && step.part !== undefined && step.part !== prev?.part;
        // Нумерация — внутри своей части пути.
        let n = 1;
        for (let j = i - 1; j >= 0 && sectionOf(steps[j]!) === section; j--) n++;
        return (
          <Fragment key={step.id}>
            {newSection && <li className={styles.section}>{SECTION_TITLES[section]}</li>}
            {newPart && (
              <li className={styles.part}>
                Часть {step.part}
                {partTitles[step.part! - 1] && ` · ${partTitles[step.part! - 1]}`}
              </li>
            )}
            <li>
              <button
                className={`${styles.step} ${styles[status]}`}
                disabled={status === 'locked'}
                onClick={() => onSelect(step.id)}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <span className={styles.marker}>{status === 'done' ? <Check /> : `${n}.`}</span>
                <span>
                  {step.title}
                  {tag && (
                    <span className={step.kind === 'exam' ? `${styles.kindTag} ${styles.kindTagExam}` : styles.kindTag}>
                      {tag}
                    </span>
                  )}
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
