import { useLang } from '../i18n/LangContext';
import { localizeError } from '../lib/errors';
import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { PhotoInputError, preparePhoto } from '../lib/photo';
import { cameraMode } from '../lib/capabilities';
import CameraCapture from './CameraCapture';

/**
 * The consent statement and photo picker for a personal portrait, shared by
 * the questionnaire's last step and the result page. Consent is explicit (an
 * unticked box gates the picker) because a face photo is sensitive biometric
 * data: it says what is sent where, for how long, and that it must be your
 * own photo. Nothing leaves the browser here: onPhoto gets the prepared
 * JPEG Blob and the caller decides when to upload it.
 */
export default function PhotoConsent({ onPhoto, onCancel, busyLabel = null, className = '', headingLevel = 3 }) {
  // h3 under the result page's h2 section; h2 on the quiz, right under its h1.
  const Heading = `h${headingLevel}`;
  const { lang, copy } = useLang();
  const t = copy.consent;
  const panelRef = useRef(null);
  const reduce = useReducedMotion();
  // On a phone the panel opens below the fold; bring it into view so the
  // reader sees what they are agreeing to instead of nothing happening.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);
  const [agreed, setAgreed] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const consentId = useId();
  // Decided once: the device does not change while the panel is open.
  const [camera] = useState(cameraMode);
  const [viewfinder, setViewfinder] = useState(false);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // choosing the same file again should still fire
    await handlePhoto(file);
  }

  // A chosen file and a camera shot take the same path: checked, shrunk to a
  // 1024 px JPEG, then handed to the caller.
  async function handlePhoto(file) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      await onPhoto(await preparePhoto(file));
    } catch (err) {
      setError(err instanceof PhotoInputError || err?.message ? localizeError(lang, err.message) : t.unknownError);
    } finally {
      setPreparing(false);
    }
  }

  const busy = preparing || Boolean(busyLabel);

  return (
    <div ref={panelRef} className={`max-w-[36rem] scroll-mb-6 bg-paper-2 p-5 sm:p-6 ${className}`}>
      <Heading className="font-display text-[1.25rem] leading-tight">{t.heading}</Heading>
      <ul className="mt-3 list-disc space-y-1 ps-5 text-[0.95rem] leading-normal sm:space-y-1.5 sm:text-body">
        {t.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <label htmlFor={consentId} className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          id={consentId}
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
        />
        <span className="text-body">{t.agree}</span>
      </label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFile}
      />
      {/* capture="user" opens the front camera directly on a phone. */}
      {camera === 'native' && (
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFile}
        />
      )}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        {camera && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!agreed || busy}
            onClick={() => (camera === 'native' ? cameraRef.current?.click() : setViewfinder(true))}
          >
            {preparing ? t.preparing : busyLabel || t.takeSelfie}
          </button>
        )}
        <button
          type="button"
          className={`btn ${camera ? 'btn-secondary' : 'btn-primary'}`}
          disabled={!agreed || busy}
          onClick={() => fileRef.current?.click()}
        >
          {preparing && !camera ? t.preparing : (!camera && busyLabel) || t.choose}
        </button>
        {onCancel && (
          <button type="button" className="link-ink tap meta min-h-[44px] text-ink" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
      </div>
      {viewfinder && <CameraCapture onCapture={handlePhoto} onClose={() => setViewfinder(false)} />}
      {error && (
        <p className="text-body mt-4 text-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
