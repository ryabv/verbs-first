import type { ReactNode } from 'react';
import type { GrammarSection } from '../model/types';
import { PhraseList } from './PhraseList';
import styles from './Lesson.module.css';

interface Props {
  section: GrammarSection;
  renderPhraseAction?: (greek: string) => ReactNode;
  renderGreek?: (greek: string, russian: string) => ReactNode;
}

export function GrammarSectionView({ section, renderPhraseAction, renderGreek }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{section.title}</h2>
      {section.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {section.examples && <PhraseList phrases={section.examples} renderAction={renderPhraseAction} renderGreek={renderGreek} />}
    </section>
  );
}
