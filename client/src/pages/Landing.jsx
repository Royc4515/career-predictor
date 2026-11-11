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
import { useLang } from '../i18n/LangContext';
import { careerTitle } from '../i18n/content';

function CoverSpecimen({ samples }) {
  const { lang, copy } = useLang();
  const [index, setIndex] = useState(0);
  const current = samples[index];
  const status = useImageReady(current.imageUrl);
  const title = careerTitle(lang, current.title);

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
            <Cover title={title} imageUrl={current.imageUrl} imageStatus={status} specimen reveal="press" />
          </TiltCard>
        </m.div>
      </AnimatePresence>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="meta" aria-live="polite">
          {copy.landing.headlineOf(index + 1, samples.length)}
        </p>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % samples.length)}
          className="meta link-ink min-h-[44px] text-ink"
        >
          {copy.landing.anotherHeadline}
        </button>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const { copy } = useLang();
  const t = copy.landing;
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
        <section className="mx-auto grid max-w-[1240px] gap-10 pt-8 pb-10 sm:gap-14 sm:pt-20 sm:pb-20 lg:grid-cols-12 lg:gap-10 lg:pb-28">
          <div className="lg:col-span-7 lg:pt-6">
            <RevealText
              text={t.hero}
              className="font-display text-display font-normal text-balance"
              delay={0.1}
              proximity
            />

            <m.p {...enter(0.3)} className="font-display mt-6 max-w-[33rem] text-lede sm:mt-8">
              {t.lede}
            </m.p>

            <m.div {...enter(0.4)} className="mt-8 flex flex-col items-start gap-4 sm:mt-10">
              <GoogleButton>{t.start}</GoogleButton>
              <p className="meta max-w-[26rem]">{t.signInNote}</p>
              {authFailed && (
                <p role="alert" className="text-sm font-medium text-alert">
                  {t.authFailed}
                </p>
              )}
            </m.div>
          </div>

          <m.div {...enter(0.5)} className="mx-auto w-full max-w-[460px] lg:col-span-5 lg:col-start-8 lg:max-w-none">
            <CoverSpecimen samples={samples} />
          </m.div>
        </section>

        <IssueStack samples={samples} />

        <section aria-labelledby="how-heading" className="mx-auto max-w-[1240px] border-t border-ink py-10 sm:py-24">
          <h2 id="how-heading" className="font-display text-section">
            {t.howHeading}
          </h2>
          <ol className="mt-4 sm:mt-8">
            {t.steps.map((step) => (
              <li
                key={step.title}
                className="grid gap-2 border-t border-rule py-5 first:border-t-0 sm:gap-3 sm:py-7 md:grid-cols-[1fr_1.4fr] md:gap-10"
              >
                <h3 className="font-display text-section text-balance">{step.title}</h3>
                <p className="text-body max-w-[38rem] md:pt-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="corrections-heading" className="mx-auto max-w-[1240px] pb-10 sm:pb-24">
          <div className="bg-paper-2 p-5 sm:p-10">
            <h2 id="corrections-heading" className="font-display text-section">
              {t.correctionsHeading}
            </h2>
            <dl className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 md:grid-cols-3 md:gap-10">
              {t.corrections.map(([term, detail]) => (
                <div key={term}>
                  <dt className="inline font-semibold">{term} </dt>
                  <dd className="text-body inline">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-body mt-6 sm:mt-10">
            {t.alreadyHave}{' '}
            <a href={authUrls.google} className="link-ink tap">
              {t.signInAgain}
            </a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
