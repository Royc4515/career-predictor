import { Link } from 'react-router-dom';
import Masthead from '../components/Masthead';
import { setNavDirection } from '../lib/navDirection';
import { useCopy } from '../i18n/LangContext';

export default function NotFound() {
  const { notFound } = useCopy();
  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead />
      <main id="main" className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-title text-balance">{notFound.title}</h1>
        <p className="mt-5 text-lede">{notFound.body}</p>
        <Link
          to="/"
          viewTransition
          onClick={() => setNavDirection(null)}
          className="link-ink tap mt-8 self-start text-lede"
        >
          {notFound.front}
        </Link>
      </main>
    </div>
  );
}
