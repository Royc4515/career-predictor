import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { useAuth } from '../app/AuthContext';
import Masthead from '../components/Masthead';
import GoogleButton from '../components/GoogleButton';
import RevealText from '../components/RevealText';
import Cover from '../components/Cover';
import Footer from '../components/Footer';
import TiltCard from '../components/effects/TiltCard';
import IssueStack from '../components/effects/IssueStack';
import { authUrls } from '../lib/api';
import { useSamples } from '../hooks/useSamples';
import { useImageReady } from '../hooks/useImageReady';
import { EASE_OUT, rise } from '../lib/motion';

// Read top to bottom, so the order carries the sequence without numerals.
const STEPS = [
  {
    title: 'Answer five questions',
    body: 'Your strengths, your Mondays, your five-year plan. Honest answers are optional; the outcome is equally scientific either way.',
  },
  {
    title: 'The desk consults its table',
    body: 'Forty-four possible futures, each one typed by hand, and all five of your answers have a say in which one you get. No model is asked for an opinion.',
  },
  {
    title: 'You make the cover',
    body: 'An image model shoots a portrait for your headline. Download the finished cover or share it straight from your phone.',
  },
];

const CORRECTIONS = [
  [
    'The forecast',
    'is a lookup table written by one person. Same answers, same result, every time. We regret implying otherwise.',
  ],
  [
    'The portrait',
    'is generated once per career by a text-to-image model and cached, so every reader with your title gets the same shot.',
  ],
  [
    'Your data',
    'is your Google name, email and profile photo link, plus your five answers, kept so your cover is still here when you come back. None of it goes to the image model.',
  ],
];

function CoverSpecimen({ samples }) {
  const [index, setIndex] = useState(0);
  const current = samples[index];
  const status = useImageReady(current.imageUrl);

  return (
    <div>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.div
          key={current.title}
          initial={{ opacity: 0, transform: 'translateY(8px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)', transition: { duration: 0.15 } }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <TiltCard>
            <Cover title={current.title} imageUrl={current.imageUrl} imageStatus={status} specimen reveal="press" />
          </TiltCard>
        </m.div>
      </AnimatePresence>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="meta" aria-live="polite">
          Headline {index + 1} of {samples.length}. All real.
        </p>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % samples.length)}
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
  const samples = useSamples();
  const navigate = useNavigate();

  // A signed-in reader goes straight to their cover; the result page sends
  // them on to the questionnaire if they have not finished it yet.
  useEffect(() => {
    if (!loading && user) navigate('/result', { replace: true });
  }, [user, loading, navigate]);

  const authFailed = new URLSearchParams(window.location.search).get('error') === 'auth_failed';

  // The page's single orchestrated moment. Short on purpose: the sign-in
  // button is usable within about a second.
  const enter = (delay) => ({ ...rise(12), transition: { duration: 0.6, ease: EASE_OUT, delay } });

  return (
    <div className="min-h-dvh">
      <Masthead />

      <main id="main" className="px-4 sm:px-8">
        <section className="mx-auto grid max-w-[1240px] gap-14 pt-12 pb-20 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:pb-28">
          <div className="lg:col-span-7 lg:pt-6">
            <RevealText
              text="Your career, predicted with unwarranted confidence."
              className="font-display text-display font-normal text-balance"
              delay={0.1}
              proximity
            />

            <m.p {...enter(0.3)} className="font-display mt-8 max-w-[33rem] text-lede">
              Answer five questions and our editors will put you on the cover of a career magazine that does not exist.
              It takes about two minutes. The results are final.
            </m.p>

            <m.div {...enter(0.4)} className="mt-10 flex flex-col items-start gap-4">
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

          <m.div {...enter(0.5)} className="mx-auto w-full max-w-[460px] lg:col-span-5 lg:col-start-8 lg:max-w-none">
            <CoverSpecimen samples={samples} />
          </m.div>
        </section>

        <IssueStack samples={samples} />

        <section aria-labelledby="how-heading" className="mx-auto max-w-[1240px] border-t border-ink py-16 sm:py-24">
          <h2 id="how-heading" className="font-display text-section">
            How it works
          </h2>
          <ol className="mt-8">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className="grid gap-3 border-t border-rule py-7 first:border-t-0 md:grid-cols-[1fr_1.4fr] md:gap-10"
              >
                <h3 className="font-display text-section text-balance">{step.title}</h3>
                <p className="text-body max-w-[38rem] md:pt-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="corrections-heading" className="mx-auto max-w-[1240px] pb-16 sm:pb-24">
          <div className="bg-paper-2 p-6 sm:p-10">
            <h2 id="corrections-heading" className="font-display text-section">
              Corrections
            </h2>
            <dl className="mt-6 grid gap-6 md:grid-cols-3 md:gap-10">
              {CORRECTIONS.map(([term, detail]) => (
                <div key={term}>
                  <dt className="inline font-semibold">{term} </dt>
                  <dd className="text-body inline">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-body mt-10">
            Already have a cover?{' '}
            <a href={authUrls.google} className="link-ink tap">
              Sign in to see it again
            </a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
