import { Link } from 'react-router-dom';
import { issueFor } from '../lib/issue';

export function Wordmark({ className = '' }) {
  return (
    <span className={`font-display leading-none font-semibold tracking-[-0.035em] ${className}`}>CareerPredict</span>
  );
}

/**
 * Header shared by every page. It carries a fixed view-transition-name so it
 * stays anchored while route content swaps underneath it.
 */
export default function Masthead({ right = null }) {
  const issue = issueFor();
  return (
    <header style={{ viewTransitionName: 'masthead' }} className="relative z-10 px-4 sm:px-8">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 border-b border-ink py-4">
        <Link to="/" viewTransition aria-label="CareerPredict, home" className="text-ink">
          <Wordmark className="text-[1.5rem]" />
        </Link>
        <div className="flex items-center gap-6">
          <p className="meta hidden md:block">
            Issue {issue.number}, {issue.label}
          </p>
          {right}
        </div>
      </div>
    </header>
  );
}
