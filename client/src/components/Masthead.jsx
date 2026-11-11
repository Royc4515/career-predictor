import { Link } from 'react-router-dom';
import { issueFor } from '../lib/issue';
import { setNavDirection } from '../lib/navDirection';
import { useLang } from '../i18n/LangContext';

export function Wordmark({ className = '' }) {
  return (
    <span translate="no" className={`font-display leading-none font-semibold tracking-[-0.035em] ${className}`}>
      CareerPredict
    </span>
  );
}

/**
 * Header shared by every page. It carries a fixed view-transition-name so it
 * stays anchored (index.css pins its group) while route content swaps.
 */
/**
 * The other language, named in that language (English readers see עברית).
 * lang on the label lets a screen reader pronounce it right.
 */
function LangToggle() {
  const { copy, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(copy.lang.switchToLang)}
      lang={copy.lang.switchToLang}
      aria-label={copy.lang.switchLabel}
      className="meta link-ink tap min-h-[44px] text-ink"
    >
      {copy.lang.switchTo}
    </button>
  );
}

export default function Masthead({ right = null }) {
  const { lang, copy } = useLang();
  const issue = issueFor(new Date(), lang);
  return (
    <header style={{ viewTransitionName: 'masthead' }} className="relative z-10 px-4 sm:px-8">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 border-b border-ink py-4">
        <Link
          to="/"
          // Asked for on purpose: the front page stays put instead of sending
          // a signed-in reader straight back to their cover.
          state={{ home: true }}
          viewTransition
          onClick={() => setNavDirection(null)}
          aria-label={copy.common.home}
          className="text-ink"
        >
          <Wordmark className="text-[1.5rem]" />
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <p className="meta hidden md:block">{copy.common.issueLine(issue.number, issue.label)}</p>
          <LangToggle />
          {right}
        </div>
      </div>
    </header>
  );
}
