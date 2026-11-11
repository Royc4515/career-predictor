import Odometer from './effects/Odometer';
import { useLang } from '../i18n/LangContext';
import { analysisNotes, findingFor, optionLabel } from '../i18n/content';
import { analysisRows } from '../lib/analysis';

/**
 * An issue's report: the quoted evidence with the analyst's lines, the
 * figures and the detailed analysis. Shared by the result page and the
 * public share page, so a shared link shows exactly what its owner saw.
 * career: the localized { title, caption, salary, outlook } (careerCopy).
 */
export default function Report({ evidence, stats, career }) {
  const { lang, copy } = useLang();
  const t = copy.result;
  return (
    <>
      {evidence.length > 0 && (
        <section aria-labelledby="evidence-heading" className="mt-12 border-t border-ink pt-6">
          <h2 id="evidence-heading" className="font-display text-section">
            {t.evidence}
          </h2>
          {/* Quote, then the analyst's conclusion: the satire is the
              straight face between the two. */}
          <dl className="mt-5 space-y-5">
            {evidence.map((quote) => (
              <div key={quote} className="border-s-2 border-mark ps-4">
                <dt className="text-body font-medium text-ink">
                  {lang === 'he' ? '״' : '“'}
                  {optionLabel(lang, quote)}
                  {lang === 'he' ? '״' : '”'}
                </dt>
                {findingFor(lang, quote) && (
                  <dd className="font-display mt-1 text-[1.15rem] leading-snug text-ink-2 italic">
                    {findingFor(lang, quote)}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="figures-heading" className="mt-12 border-t border-ink pt-6">
        <h2 id="figures-heading" className="font-display text-section">
          {t.figures}
        </h2>
        <dl className="mt-5 grid gap-6 bg-paper-2 p-6 sm:grid-cols-[0.8fr_1.1fr_1.1fr] sm:gap-8">
          <div>
            <dt className="meta">{t.happiness}</dt>
            <dd className="mt-1">
              <Odometer
                value={stats.happiness}
                delay={0.4}
                className="font-display tabular text-[2.6rem] leading-none"
              />
              <span> / 100</span>
            </dd>
          </div>
          <div>
            <dt className="meta">{t.salary}</dt>
            <dd className="font-display mt-1 text-[1.3rem] leading-snug">{career.salary}</dd>
          </div>
          <div>
            <dt className="meta">{t.outlook}</dt>
            <dd className="font-display mt-1 text-[1.3rem] leading-snug">{career.outlook}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="analysis-heading" className="mt-10 border-t border-ink pt-6">
        <h2 id="analysis-heading" className="font-display text-section">
          {t.analysis}
        </h2>
        <ul className="mt-4 space-y-5">
          {analysisRows(stats.happiness, analysisNotes(lang)).map((row) => (
            <li key={row.label}>
              <div className="text-body flex items-baseline justify-between gap-4">
                <span>{t.analysisLabels[row.key]}</span>
                <span className="tabular font-medium">{row.value}%</span>
              </div>
              <span
                className="mt-2 block h-[6px] origin-left rtl:origin-right bg-ink"
                style={{ width: `${row.value}%` }}
                aria-hidden="true"
              />
              <p className="font-display mt-2 text-[1.05rem] leading-snug text-ink-2 italic">{row.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
