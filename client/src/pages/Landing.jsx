import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useAuth } from '../app/AuthContext';
import Masthead from '../components/Masthead';
import GoogleButton from '../components/GoogleButton';
import RevealText from '../components/RevealText';
import Cover from '../components/Cover';
import Footer from '../components/Footer';
import { SAMPLE_TITLES } from '../content';
import { authUrls } from '../lib/api';

const EASE = [0.22, 1, 0.36, 1];

// A real sequence, so it gets numbers.
const STEPS = [
  {
    title: 'Answer five questions',
    body: 'Your strengths, your Mondays, your five-year plan. Honest answers are optional; the outcome is equally scientific either way.',
  },
  {
    title: 'The desk consults its table',
    body: 'Forty-five possible futures, each one typed by hand. Your answers pick one. No model is asked for an opinion.',
  },
  {
    title: 'You make the cover',
    body: 'An image model shoots a portrait for your headline. Download the finished cover or share it straight from your phone.',
  },
];

const FACTS = [
  [
    'The forecast',
    'A lookup table with forty-five outcomes, written by one person. Same answers, same result, every time.',
  ],
  [
    'The portrait',
    'Generated once per career by a text-to-image model, then cached, so every reader with your title gets the same shot.',
  ],
  [
    'Your data',
    'Your Google name, email and profile photo link, plus your five answers, kept so your cover is still here when you come back. None of it goes to the image model.',
  ],
];

function CoverSpecimen() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const title = SAMPLE_TITLES[index];

  return (
    <div>
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div
            key={title}
            initial={reduce ? false : { opacity: 0, rotate: 1.2, y: 10 }}
            animate={{ opacity: 1, rotate: 0, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, rotate: -1.2, y: -6, transition: { duration: 0.2 } }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <Cover title={title} specimen />
          </m.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="meta" aria-live="polite">
          Real headline {index + 1} of {SAMPLE_TITLES.length} shown
        </p>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % SAMPLE_TITLES.length)}
          className="meta link-ink min-h-[44px] text-ink"
        >
          Show another headline
        </button>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // A signed-in reader goes straight to their cover; the result page sends
  // them on to the questionnaire if they have not finished it yet.
  useEffect(() => {
    if (!loading && user) navigate('/result', { replace: true });
  }, [user, loading, navigate]);

  const authFailed = new URLSearchParams(window.location.search).get('error') === 'auth_failed';

  // The page's single orchestrated moment: headline, then deck, then CTA,
  // then the cover. Everything below the fold is static.
  const enter = (delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease: EASE, delay },
        };

  return (
    <div className="min-h-dvh">
      <Masthead />

      <main id="main" className="px-4 sm:px-8">
        <section className="mx-auto grid max-w-[1240px] gap-14 pt-12 pb-20 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:pb-28">
          <div className="lg:col-span-7 lg:pt-6">
            <RevealText
              text="Your career, predicted with unwarranted confidence."
              className="font-display text-[clamp(2.8rem,7.2vw,6.4rem)] leading-[0.96] font-normal"
              delay={0.1}
            />

            <m.p
              {...enter(0.6)}
              className="font-display mt-8 max-w-[33rem] text-[1.3rem] leading-[1.5] text-ink-2 sm:text-[1.4rem]"
            >
              Answer five questions and our editors will put you on the cover of a career magazine that does not exist.
              It takes about two minutes. The results are final.
            </m.p>

            <m.div {...enter(0.75)} className="mt-10 flex flex-col items-start gap-4">
              <GoogleButton>Sign in with Google to start</GoogleButton>
              <p className="meta max-w-[26rem]">
                Signing in keeps your cover saved. We keep your Google name, email, profile photo link and your five
                answers.
              </p>
              {authFailed && (
                <p role="alert" className="text-sm font-medium text-alert">
                  Google sign-in didn&rsquo;t complete. Try again, and allow access to your name and email.
                </p>
              )}
            </m.div>
          </div>

          <m.div {...enter(0.45)} className="mx-auto w-full max-w-[420px] lg:col-span-4 lg:col-start-9 lg:max-w-none">
            <CoverSpecimen />
          </m.div>
        </section>

        <section aria-labelledby="how-heading" className="mx-auto max-w-[1240px] border-t border-ink py-16 sm:py-24">
          <h2 id="how-heading" className="font-display text-[clamp(2rem,3.6vw,2.8rem)] leading-tight">
            How it works
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-12">
            {STEPS.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[auto_1fr] gap-x-4 md:block">
                <span className="font-display tabular text-[2.4rem] leading-none text-ink-3" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="md:mt-4">
                  <h3 className="font-display text-[1.5rem] leading-snug">{step.title}</h3>
                  <p className="mt-2 max-w-[34ch] leading-relaxed text-ink-2">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="real-heading" className="mx-auto max-w-[1240px] border-t border-rule py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-12">
            <h2 id="real-heading" className="font-display text-[clamp(2rem,3.6vw,2.8rem)] leading-tight lg:col-span-4">
              What is actually real here
            </h2>
            <dl className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
              {FACTS.map(([term, detail]) => (
                <div key={term}>
                  <dt className="font-semibold">{term}</dt>
                  <dd className="mt-2 leading-relaxed text-ink-2">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-14 text-ink-2">
            Already have a cover?{' '}
            <a href={authUrls.google} className="link-ink text-ink">
              Sign in to see it again
            </a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
