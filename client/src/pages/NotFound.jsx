import { Link } from 'react-router-dom';
import Masthead from '../components/Masthead';
import { setNavDirection } from '../lib/navDirection';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead />
      <main id="main" className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-title text-balance">This page doesn&rsquo;t exist</h1>
        <p className="mt-5 text-lede">The link may be old or mistyped. Your cover, if you have one, is safe.</p>
        <Link
          to="/"
          viewTransition
          onClick={() => setNavDirection(null)}
          className="link-ink tap mt-8 self-start text-lede"
        >
          Go to the front page
        </Link>
      </main>
    </div>
  );
}
