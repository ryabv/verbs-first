import { Link } from 'react-router';
import { GRAMMAR_TOPICS, plainTitle } from '@/entities/grammar';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import styles from './Grammar.module.css';

/** /grammar — справочник: темы и правила. На правила ссылаются уроки, тексты и окна слов. */
export function GrammarPage() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'История', to: routes.home() }, { label: 'Справочник' }]} />
        <h1 className={styles.title}>Справочник</h1>
        <p className={styles.lead}>
          Правила греческого, которые встречаются в уроках и текстах, — коротко, с таблицами и примерами. Каждое греческое
          слово нажимается: перевод, словарная форма и «в карточки».
        </p>
      </header>

      <ul className={styles.tiles}>
        {GRAMMAR_TOPICS.map((topic) => (
          <li key={topic.id}>
            <div className={styles.tile}>
              <Link to={routes.grammar(topic.id)} className={styles.tileTitle}>
                {topic.title}
              </Link>
              <span className={styles.tileLead}>{topic.lead}</span>
              <ul className={styles.ruleList}>
                {topic.rules.map((rule) => (
                  <li key={rule.id}>
                    <Link to={routes.grammar(topic.id, rule.id)}>{plainTitle(rule.title)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
        <li>
          <div className={styles.tile}>
            <Link to={routes.alphabetReference()} className={styles.tileTitle}>
              Чтение и ударение
            </Link>
            <span className={styles.tileLead}>Буквы, сочетания букв и где ставится ударение — в справочнике алфавита.</span>
          </div>
        </li>
      </ul>
    </div>
  );
}
