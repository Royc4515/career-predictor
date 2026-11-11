import { useState } from 'react';
import { deletePortrait, uploadPortrait } from '../lib/api';
import PhotoConsent from './PhotoConsent';

/**
 * "Put your face on it": the opt-in personal portrait. Consent comes first
 * and is explicit (an unticked box), because a face photo is sensitive
 * biometric data: we say what is sent where, for how long, and that it must
 * be your own photo. Uploading needs the box ticked; nothing is sent before.
 *
 * personal: { status: 'generating' | 'ready' | 'failed', imageUrl } or null.
 * showing: 'mine' | 'desk', which portrait the cover shows.
 * blocked: why it isn't available ('old-issue' | 'off'); an old issue says
 * so instead of the section silently missing. notice: a message carried over
 * from the questionnaire (a selfie that couldn't be sent).
 */
export default function PersonalPortrait({ personal, available, blocked, notice, showing, onShow, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null); // 'uploading' | 'removing'
  const [error, setError] = useState(null);

  if (!available && !personal && blocked !== 'old-issue') return null;

  async function send(photo) {
    setError(null);
    setBusy('uploading');
    try {
      const next = await uploadPortrait(photo);
      setOpen(false);
      onChange(next);
      onShow('mine');
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

      {notice && !personal && (
        <p className="text-body mt-3" role="status">
          {notice}
        </p>
      )}

      {!available && !personal && blocked === 'old-issue' && (
        <p className="text-body mt-3 max-w-[34rem]">
          This cover is from an older issue of the questionnaire. Retake it and pick &ldquo;Use my own photo&rdquo; on
          the last step to be on the cover yourself.
        </p>
      )}

      {available && !personal && !open && (
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
        <PhotoConsent
          className="mt-5"
          onPhoto={send}
          busyLabel={busy === 'uploading' ? 'Sending…' : null}
          onCancel={() => {
            setOpen(false);
            setError(null);
          }}
        />
      )}

      {error && (
        <p className="text-body mt-4 text-ink" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
