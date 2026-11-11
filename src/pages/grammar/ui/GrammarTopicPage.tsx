import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { getGrammarTopic, GRAMMAR_TOPICS, plainTitle, type GrammarRule } from '@/entities/grammar';
import { Phrase, RichText } from '@/features/card-add';
import { SpeakButton } from '@/features/pronounce';
import { routes } from '@/shared/config/routes';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { Arrow } from '@/shared/ui/ornament';
import styles from './Grammar.module.css';

/** /grammar/:topicId — тема справочника; #правило — сразу к нему. */
export function GrammarTopicPage() {
  const { topicId = '' } = useParams();
  const { hash } = useLocation();
  const topic = getGrammarTopic(topicId);

  // Ссылка на правило (#id) — прокручиваем к нему, когда страница отрисована.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  if (!topic) {
    return (
      <div className={styles.page}>
        <p className={styles.lead}>Такой темы в справочнике нет.</p>
        <Link to={routes.grammar()}>
          <Arrow direction="left" /> К справочнику
        </Link>
      </div>
    );
  }

  const index = GRAMMAR_TOPICS.indexOf(topic);
  const next = GRAMMAR_TOPICS[index + 1];
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Breadcrumbs items={[{ label: 'Справочник', to: routes.grammar() }, { label: topic.title }]} />
        <h1 className={styles.title}>{topic.title}</h1>
        <p className={styles.lead}>{topic.lead}</p>
        {topic.lessons && (
          <p className={styles.lessons}>
            В уроках:{' '}
            {topic.lessons.map((n, i) => (
              <span key={n}>
                {i > 0 && ', '}
                <Link to={routes.lesson(n)}>урок {n}</Link>
              </span>
            ))}
          </p>
        )}
        <nav className={styles.toc} aria-label="Правила темы">
          {topic.rules.map((rule) => (
            <a key={rule.id} href={`#${rule.id}`} className={styles.tocLink}>
              {plainTitle(rule.title)}
            </a>
          ))}
        </nav>
      </header>

      {topic.rules.map((rule) => (
        <Rule key={rule.id} rule={rule} />
      ))}

      <nav className={styles.pager}>
        <Link to={routes.grammar()}>
          <Arrow direction="left" /> Все темы
        </Link>
        {next && (
          <Link to={routes.grammar(next.id)}>
            {next.title} <Arrow />
          </Link>
        )}
      </nav>
    </div>
  );
}

function Rule({ rule }: { rule: GrammarRule }) {
  const [head, ...rows] = rule.table ?? [];
  return (
    <section id={rule.id} className={styles.rule}>
      <h2 className={styles.ruleTitle}>
        <span>
          <RichText text={rule.title} />
        </span>
        <a href={`#${rule.id}`} className={styles.anchor} aria-label="Ссылка на правило">
          #
        </a>
      </h2>
      {rule.paragraphs.map((p, i) => (
        <p key={i} className={styles.para}>
          <RichText text={p} />
        </p>
      ))}
      {head && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {head.map((cell, i) => (
                  <th key={i}>
                    <RichText text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        <RichText text={cell} />
                      </th>
                    ) : (
                      <td key={i}>
                        <RichText text={cell} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rule.examples && (
        <ul className={styles.examples}>
          {rule.examples.map((ex) => (
            <li key={ex.greek}>
              <span className={styles.exGreek}>
                <Phrase greek={ex.greek} russian={ex.russian} after={<SpeakButton text={ex.greek} />} />
              </span>
              <span className={styles.exRussian}>{ex.russian}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
