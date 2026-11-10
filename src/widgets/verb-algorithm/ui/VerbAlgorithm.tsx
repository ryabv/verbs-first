import { useState, type ReactNode } from 'react';
import { PersonSwitcher, VerbParadigm, VerbTable, type Person, type SentenceForm, type Tense, type Verb } from '@/entities/verb';
import { SpeakButton } from '@/features/pronounce';
import { Button } from '@/shared/ui/button';
import styles from './VerbAlgorithm.module.css';

type View = 'table' | 'paradigm';

interface Props {
  verbs: readonly Verb[];
  /** Слот для начальной формы глагола (например, с добавлением в карточки). */
  renderWord?: (greek: string, russian: string) => ReactNode;
  /** Только уже пройденные времена и формы. Не задано — вся таблица. */
  tenses?: readonly Tense[];
  forms?: readonly SentenceForm[];
}

/** «Алгоритм глагола»: список глаголов урока + таблица выбранного глагола. */
export function VerbAlgorithm({ verbs, renderWord, tenses, forms }: Props) {
  const [verbId, setVerbId] = useState(verbs[0]?.id);
  const [person, setPerson] = useState<Person>(0);
  const [view, setView] = useState<View>('table');
  const verb = verbs.find((v) => v.id === verbId) ?? verbs[0];

  if (!verb) return null;

  return (
    <div className={styles.root}>
    <div className={styles.layout}>
      <nav className={styles.list} aria-label="Глаголы урока">
        {verbs.map((v) => (
          <button
            key={v.id}
            className={v.id === verb.id ? `${styles.item} ${styles.active}` : styles.item}
            onClick={() => setVerbId(v.id)}
          >
            <span className={styles.lemma}>{v.lemma}</span>
            <span className={styles.translation}>{v.translation}</span>
          </button>
        ))}
      </nav>

      <div className={styles.main}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {renderWord ? renderWord(verb.lemma, verb.translation) : verb.lemma} <SpeakButton text={verb.lemma} />
            </h2>
            <div className={styles.subtitle}>{verb.translation}</div>
            {verb.pastHint && (!tenses?.length || tenses.includes('past')) && <div className={styles.hint}>Прошедшее: {verb.pastHint}</div>}
          </div>
          <Button variant="secondary" className={styles.toggle} onClick={() => setView(view === 'table' ? 'paradigm' : 'table')}>
            {view === 'table' ? 'Все лица' : 'Таблица'}
          </Button>
        </header>

        {view === 'table' ? (
          <>
            <PersonSwitcher value={person} onChange={setPerson} />
            <VerbTable verb={verb} person={person} tenses={tenses} forms={forms} renderCellAction={(text) => <SpeakButton text={text} />} />
          </>
        ) : (
          <VerbParadigm verb={verb} tenses={tenses} />
        )}
      </div>
    </div>
    </div>
  );
}
