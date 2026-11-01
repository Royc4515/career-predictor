import { Link } from 'react-router-dom';
import Masthead from '../components/Masthead';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead />
      <main id="main" className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-tight">This page doesn&rsquo;t exist</h1>
        <p className="mt-5 text-lg text-ink-2">
          The link may be old or mistyped. Your cover, if you have one, is safe.
        </p>
        <Link to="/" viewTransition className="link-ink mt-8 self-start text-lg">
          Go to the front page
        </Link>
      </main>
    </div>
  );
}
