import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { PhotoInputError, preparePhoto } from '../lib/photo';

/**
 * The consent statement and photo picker for a personal portrait, shared by
 * the questionnaire's last step and the result page. Consent is explicit (an
 * unticked box gates the picker) because a face photo is sensitive biometric
 * data: it says what is sent where, for how long, and that it must be your
 * own photo. Nothing leaves the browser here: onPhoto gets the prepared
 * JPEG Blob and the caller decides when to upload it.
 */
export default function PhotoConsent({ onPhoto, onCancel, busyLabel = null, className = '' }) {
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
  const consentId = useId();

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // choosing the same file again should still fire
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      await onPhoto(await preparePhoto(file));
    } catch (err) {
      setError(err instanceof PhotoInputError || err?.message ? err.message : 'Something went wrong. Try again.');
    } finally {
      setPreparing(false);
    }
  }

  const busy = preparing || Boolean(busyLabel);

  return (
    <div ref={panelRef} className={`max-w-[36rem] scroll-mb-6 bg-paper-2 p-5 sm:p-6 ${className}`}>
      <h3 className="font-display text-[1.25rem] leading-tight">Before you send a selfie</h3>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.95rem] leading-normal sm:space-y-1.5 sm:text-body">
        <li>Your photo goes to Pollinations and the Microsoft image model behind it, once, to make this cover.</li>
        <li>We keep it in memory only, never on disk, and delete it within ten minutes.</li>
        <li>We keep the finished cover, visible only to you, until you remove it or retake the questionnaire.</li>
        <li>Only send a photo of yourself.</li>
      </ul>
      <label htmlFor={consentId} className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          id={consentId}
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
        />
        <span className="text-body">This is a photo of me, and I agree to it being used this way.</span>
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
      <div className="mt-5 flex flex-wrap items-center gap-6">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!agreed || busy}
          onClick={() => fileRef.current?.click()}
        >
          {preparing ? 'Preparing…' : busyLabel || 'Choose a photo'}
        </button>
        {onCancel && (
          <button type="button" className="link-ink tap meta min-h-[44px] text-ink" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p className="text-body mt-4 text-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
