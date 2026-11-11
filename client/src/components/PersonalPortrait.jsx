import { useId, useRef, useState } from 'react';
import { deletePortrait, uploadPortrait } from '../lib/api';
import { PhotoInputError, preparePhoto } from '../lib/photo';

/**
 * "Put your face on it": the opt-in personal portrait. Consent comes first
 * and is explicit (an unticked box), because a face photo is sensitive
 * biometric data: we say what is sent where, for how long, and that it must
 * be your own photo. Uploading needs the box ticked; nothing is sent before.
 *
 * personal: { status: 'generating' | 'ready' | 'failed', imageUrl } or null.
 * showing: 'mine' | 'desk', which portrait the cover shows.
 */
export default function PersonalPortrait({ personal, available, showing, onShow, onChange }) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(null); // 'preparing' | 'uploading' | 'removing'
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const consentId = useId();

  if (!available && !personal) return null;

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // choosing the same file again should still fire
    if (!file) return;
    setError(null);
    try {
      setBusy('preparing');
      const photo = await preparePhoto(file);
      setBusy('uploading');
      const next = await uploadPortrait(photo);
      setOpen(false);
      setAgreed(false);
      onChange(next);
      onShow('mine');
    } catch (err) {
      setError(err instanceof PhotoInputError || err?.message ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setError(null);
    setBusy('removing');
    try {
      await deletePortrait();
      onChange(null);
      onShow('desk');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const status = personal?.status;

  return (
    <section aria-labelledby="personal-heading" className="mt-12 border-t border-ink pt-6">
      <h2 id="personal-heading" className="font-display text-section">
        Put your face on it
      </h2>

      {!personal && !open && (
        <>
          <p className="text-body mt-3 max-w-[34rem]">
            Send one selfie and the photographer reshoots this cover with you in it. Your photo is deleted from our
            server within minutes.
          </p>
          <button type="button" className="btn btn-secondary mt-5" onClick={() => setOpen(true)}>
            Use my photo
          </button>
        </>
      )}

      {status === 'generating' && (
        <p className="text-body mt-3" role="status">
          Developing your portrait. It takes about half a minute; the cover updates when it is ready.
        </p>
      )}

      {status === 'ready' && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div role="radiogroup" aria-label="Portrait on the cover" className="flex gap-2">
            {[
              ['mine', 'You'],
              ['desk', "The desk's pick"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={showing === value}
                onClick={() => onShow(value)}
                className={`btn min-h-[44px] px-4 ${showing === value ? 'btn-primary' : 'btn-secondary'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="link-ink tap meta min-h-[44px] text-ink" onClick={remove} disabled={!!busy}>
            {busy === 'removing' ? 'Removing…' : 'Remove my photo'}
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="mt-3">
          <p className="text-body" role="status">
            The darkroom could not develop this one, so your cover keeps the desk&rsquo;s portrait. A clear,
            front-facing photo in good light works best.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)} disabled={!available}>
              Try another photo
            </button>
            <button type="button" className="link-ink tap meta min-h-[44px] text-ink" onClick={remove}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="mt-5 max-w-[36rem] bg-paper-2 p-5 sm:p-6">
          <h3 className="font-display text-[1.25rem] leading-tight">Before you send a selfie</h3>
          <ul className="text-body mt-3 list-disc space-y-1.5 pl-5">
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
              disabled={!agreed || !!busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy === 'preparing' ? 'Preparing…' : busy === 'uploading' ? 'Sending…' : 'Choose a photo'}
            </button>
            <button
              type="button"
              className="link-ink tap meta min-h-[44px] text-ink"
              onClick={() => {
                setOpen(false);
                setAgreed(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-body mt-4 text-ink" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
