import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { m } from 'motion/react';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import TiltCard from '../components/effects/TiltCard';
import Report from '../components/Report';
import Footer from '../components/Footer';
import { useImageReady } from '../hooks/useImageReady';
import { fetchShare } from '../lib/api';
import { formatDate } from '../lib/issue';
import { EASE_OUT, rise } from '../lib/motion';
import { localizeError } from '../lib/errors';
import { useLang } from '../i18n/LangContext';
import { careerCopy } from '../i18n/content';

// SQLite CURRENT_TIMESTAMP is UTC without a zone marker.
const parseFiled = (value) =>
  new Date(typeof value === 'string' && !value.endsWith('Z') ? `${value.replace(' ', 'T')}Z` : value);

/**
 * A shared issue, public: the cover and its report as its owner saw them, in
 * the viewer's language, with a way to get one's own. No sign-in, and
 * nothing beyond what the owner chose to share (see server shareRoutes).
 */
export default function SharePage() {
  const { token } = useParams();
  const { lang, copy } = useLang();
  const t = copy.share;
  const [share, setShare] = useState(undefined); // undefined loading, null gone
  const [error, setError] = useState(null);
  const imageStatus = useImageReady(share?.imageUrl);

  useEffect(() => {
    let cancelled = false;
    fetchShare(token)
      .then((data) => !cancelled && setShare(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const cta = (
    <Link to="/" state={{ home: true }} viewTransition className="btn btn-primary">
      {t.pageCta}
    </Link>
  );
  const header = (
    <Masthead
      right={
        <Link to="/" state={{ home: true }} className="meta link-ink tap text-ink">
          {t.pageCta}
        </Link>
      }
    />
  );

  if (error || share === null) {
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main id="main" className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center px-4 py-16">
          <h1 className="font-display text-title text-balance">{error ? copy.result.loadErrorTitle : t.goneTitle}</h1>
          <p className="mt-5 text-lede">{error ? localizeError(lang, error) : t.goneBody}</p>
          <div className="mt-8">{cta}</div>
        </main>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main id="main" className="flex flex-1 items-center justify-center">
          <p className="meta animate-pulse" role="status">
            {t.loading}
          </p>
        </main>
      </div>
    );
  }

  const career = careerCopy(
    lang,
    { title: share.title, caption: share.caption, salary: share.stats.salary, outlook: share.stats.outlook },
    share.coverGender,
  );
  const filed = formatDate(parseFiled(share.filedAt), lang, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-dvh">
      {header}
      <main id="main" className="px-4 sm:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-5 pt-4 pb-20 sm:gap-12 sm:pt-12 lg:grid-cols-12 lg:gap-10">
          <m.div className="lg:col-span-6" {...rise(10)} transition={{ duration: 0.45, ease: EASE_OUT }}>
            <div className="cover-fit relative lg:sticky lg:top-8">
              <TiltCard>
                <Cover
                  title={career.title}
                  imageUrl={share.imageUrl}
                  imageStatus={imageStatus}
                  personName={share.personName}
                  happiness={share.stats.happiness}
                  reveal="press"
                />
              </TiltCard>
            </div>
          </m.div>

          <article className="lg:col-span-5 lg:col-start-8 lg:pt-2">
            <h1 className="font-display text-[clamp(1.6rem,2.8vw,2.5rem)] leading-[1.1] text-balance">
              {career.title}
            </h1>
            {career.caption && (
              <p className="font-display mt-2 text-[1.2rem] leading-snug italic sm:mt-5 sm:text-lede">
                {career.caption}
              </p>
            )}
            <p className="meta mt-4">{t.pageFor(share.personName, filed)}</p>
            <p className="text-body mt-4 max-w-[34rem]">{t.pageIntro}</p>
            <div className="mt-5">{cta}</div>
            <Report evidence={share.evidence} stats={share.stats} career={career} />
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
