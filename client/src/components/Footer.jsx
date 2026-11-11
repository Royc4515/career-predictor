import { LINKS } from '../content';
import { useCopy } from '../i18n/LangContext';

export default function Footer() {
  const { footer } = useCopy();
  return (
    <footer className="px-4 pb-10 sm:px-8">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 border-t border-ink pt-6 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="meta max-w-md">
          {footer.madeBy}{' '}
          <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="link-ink tap text-ink">
            {footer.author}
          </a>
          {footer.satire}
        </p>
        <nav aria-label={footer.elsewhere}>
          <ul className="meta flex flex-wrap gap-x-5 gap-y-4">
            {[
              [footer.links.linkedin, LINKS.linkedin],
              [footer.links.github, LINKS.github],
              [footer.links.portfolio, LINKS.portfolio],
              [footer.links.source, LINKS.source],
            ].map(([label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="link-ink tap">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
