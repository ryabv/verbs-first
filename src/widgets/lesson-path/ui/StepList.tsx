import { Fragment } from 'react';
import type { LessonStep, StepKind } from '@/entities/lesson';
import type { StepStatus } from '@/features/lesson-progress';
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
};

interface Props {
  steps: LessonStep[];
  statusOf: (id: string) => StepStatus;
  onSelect: (id: string) => void;
}

export function StepList({ steps, statusOf, onSelect }: Props) {
  return (
    <ol className={styles.steps}>
      {steps.map((step, i) => {
        const status = statusOf(step.id);
        const tag = KIND_TAGS[step.kind];
        const newDay = step.day !== undefined && step.day !== steps[i - 1]?.day;
        return (
          <Fragment key={step.id}>
            {newDay && <li className={styles.day}>День {step.day}</li>}
            <li>
              <button
                className={`${styles.step} ${styles[status]}`}
                disabled={status === 'locked'}
                onClick={() => onSelect(step.id)}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <span className={styles.marker}>{status === 'done' ? '✓' : `${i + 1}.`}</span>
                <span>
                  {step.title}
                  {tag && <span className={styles.kindTag}>{tag}</span>}
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
