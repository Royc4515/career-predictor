import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { m } from 'motion/react';
import Masthead from '../components/Masthead';
import Cover from '../components/Cover';
import TiltCard from '../components/effects/TiltCard';
import PersonalPortrait from '../components/PersonalPortrait';
import Report from '../components/Report';
import Footer from '../components/Footer';
import { useAuth } from '../app/AuthContext';
import { useImageReady } from '../hooks/useImageReady';
import { deleteCoverPortrait, fetchCover, makeCoverCurrent, uploadCoverPortrait } from '../lib/api';
import { renderCoverBlob } from '../lib/coverCanvas';
import { coverFileName } from '../lib/coverLayout';
import { downloadBlob } from '../lib/download';
import { firstName, formatDate } from '../lib/issue';
import { EASE_OUT, rise } from '../lib/motion';
import { setNavDirection } from '../lib/navDirection';
import { localizeError } from '../lib/errors';
import { useLang } from '../i18n/LangContext';
import { careerCopy } from '../i18n/content';

// SQLite CURRENT_TIMESTAMP is UTC without a zone marker.
const parseFiled = (value) =>
  new Date(typeof value === 'string' && !value.endsWith('Z') ? `${value.replace(' ', 'T')}Z` : value);

/**
 * One back issue, opened from the gallery: the cover and its whole report
 * (figures, analysis, the two quoted answers), as the result page shows the
 * current one. From here the reader can make it their current issue again,
 * download it, or reshoot its portrait with their own face. The current
 * issue itself lives on the result page, so it redirects there.
 */
export default function IssuePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, copy } = useLang();
  const t = copy.issues;
  const [issue, setIssue] = useState(undefined); // undefined loading, null gone
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [personal, setPersonal] = useState(null);
  const [showing, setShowing] = useState('desk');
  const [blob, setBlob] = useState(null);
  const name = firstName(user?.name);

  useEffect(() => {
    let cancelled = false;
    setIssue(undefined);
    setError(null);
    fetchCover(id)
      .then((data) => {
        if (cancelled) return;
        if (data?.current) return navigate('/result', { replace: true });
        setIssue(data);
        // Its status is unknown until the image route answers; the poll
        // below settles it.
        const p = data?.personalImageUrl ? { status: 'generating', imageUrl: data.personalImageUrl } : null;
        setPersonal(p);
        setShowing(p ? 'mine' : 'desk');
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const showPersonal = showing === 'mine' && personal && personal.status !== 'failed';
  const coverUrl = showPersonal ? personal.imageUrl : issue?.imageUrl;
  const imageStatus = useImageReady(coverUrl);
  const career = issue
    ? careerCopy(
        lang,
        { title: issue.title, caption: issue.caption, salary: issue.stats.salary, outlook: issue.stats.outlook },
        issue.coverGender,
      )
    : null;

  // Polling the reader's portrait settles its status, as on the result page:
  // a failed one hands the cover back to the desk's portrait.
  useEffect(() => {
    if (!showPersonal || personal.status !== 'generating' || imageStatus === 'pending') return;
    const next = { ...personal, status: imageStatus === 'ready' ? 'ready' : 'failed' };
    setPersonal(next);
    if (next.status === 'failed') setShowing('desk');
  }, [showPersonal, personal, imageStatus]);

  // The PNG is rendered ahead of the click so the download starts inside
  // the tap.
  useEffect(() => {
    if (!issue || imageStatus === 'pending') return undefined;
    let cancelled = false;
    setBlob(null);
    renderCoverBlob({
      title: career.title,
      imageUrl: imageStatus === 'ready' ? coverUrl : null,
      personName: name,
      happiness: issue.stats.happiness,
      lang,
    })
      .then((b) => !cancelled && setBlob(b))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [issue, imageStatus, coverUrl, name, lang, career?.title]);

  async function makeCurrent() {
    setSwitching(true);
    setActionError(null);
    try {
      await makeCoverCurrent(issue.id);
      setNavDirection('forward');
      navigate('/result', { viewTransition: true });
    } catch (err) {
      setActionError(localizeError(lang, err.message));
      setSwitching(false);
    }
  }

  const header = (
    <Masthead
      right={
        <Link
          to="/issues"
          viewTransition
          onClick={() => setNavDirection('back')}
          className="meta link-ink tap text-ink"
        >
          {t.title}
        </Link>
      }
    />
  );

  if (error || issue === null) {
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main id="main" className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center px-4 py-16">
          <h1 className="font-display text-title text-balance">{error ? copy.result.loadErrorTitle : t.goneTitle}</h1>
          <p className="mt-5 text-lede">{error ? localizeError(lang, error) : t.goneBody}</p>
          <Link to="/issues" viewTransition className="btn btn-primary mt-8 self-start">
            {t.title}
          </Link>
        </main>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main id="main" className="flex flex-1 items-center justify-center">
          <p className="meta animate-pulse" role="status">
            {t.opening}
          </p>
        </main>
      </div>
    );
  }

  const filed = formatDate(parseFiled(issue.filedAt), lang, { month: 'long', day: 'numeric', year: 'numeric' });

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
                  imageUrl={coverUrl}
                  imageStatus={imageStatus}
                  personName={name}
                  happiness={issue.stats.happiness}
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
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={makeCurrent} disabled={switching} className="btn btn-primary">
                {switching ? t.switching : t.makeCurrent}
              </button>
              <button
                type="button"
                onClick={() => downloadBlob(blob, coverFileName(issue.title))}
                disabled={!blob}
                className="btn btn-secondary"
              >
                {blob ? t.download : t.preparing}
              </button>
            </div>
            {actionError && (
              <p className="text-body mt-3" role="alert">
                {actionError}
              </p>
            )}
            <p className="meta mt-5">{t.issueMeta(issue.number, filed)}</p>

            <PersonalPortrait
              personal={personal}
              available={issue.personalAvailable}
              blocked={issue.personalBlocked}
              showing={showing}
              onShow={setShowing}
              onChange={setPersonal}
              upload={(photo) => uploadCoverPortrait(issue.id, photo)}
              remove={() => deleteCoverPortrait(issue.id)}
              removeLabel={copy.personal.removeFromIssue}
            />

            <Report evidence={issue.evidence} stats={issue.stats} career={career} />
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
