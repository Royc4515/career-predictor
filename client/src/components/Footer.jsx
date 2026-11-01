import { LINKS } from '../content';

export default function Footer() {
  return (
    <footer className="px-4 pb-10 sm:px-8">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 border-t border-ink pt-6 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="meta max-w-md">
          Made by{' '}
          <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="link-ink text-ink">
            Roy Carmelli
          </a>
          . Satire: the forecast is a hand-written lookup table, and only the portrait comes from an image model.
        </p>
        <nav aria-label="Elsewhere">
          <ul className="meta flex flex-wrap gap-x-5 gap-y-2">
            {[
              ['LinkedIn', LINKS.linkedin],
              ['GitHub', LINKS.github],
              ['Portfolio', LINKS.portfolio],
              ['Source code', LINKS.source],
            ].map(([label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="link-ink">
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
