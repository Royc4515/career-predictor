import { useEffect, useRef, useState } from 'react';
import { useCopy } from '../i18n/LangContext';

/**
 * In-page viewfinder for a computer with a camera ("Take a selfie" on a
 * phone uses the phone's own camera UI instead; see cameraMode). A native
 * <dialog>: focus stays inside, Esc closes. The camera runs only while the
 * dialog is open and is released on every way out, so the browser's
 * "camera in use" light never outlives it.
 *
 * onCapture gets a File (JPEG), the same thing a file picker would give, so
 * the photo goes through the usual preparePhoto path.
 */
export default function CameraCapture({ onCapture, onClose }) {
  const t = useCopy().consent;
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [state, setState] = useState('starting'); // starting | live | captured | error
  const [error, setError] = useState(null);
  const [shot, setShot] = useState(null); // { blob, url }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // don't touch / No dialog.close() in a cleanup: the close event fires later
  // and calls onClose, which under StrictMode's double mount closed the
  // dialog right after it opened (same as the issue dialog).
  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setState('live');
      })
      .catch((err) => {
        if (cancelled) return;
        const name = err?.name;
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? t.cameraBlocked
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? t.noCamera
              : t.cameraFailed,
        );
        setState('error');
      });
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => shot && URL.revokeObjectURL(shot.url), [shot]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // The frame as the camera sees it (the preview is mirrored only so it
    // behaves like a mirror while posing).
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setShot({ blob, url: URL.createObjectURL(blob) });
        setState('captured');
      },
      'image/jpeg',
      0.92,
    );
  }

  function use() {
    if (!shot) return;
    stopCamera();
    onCapture(new File([shot.blob], 'selfie.jpg', { type: 'image/jpeg' }));
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      aria-label={t.cameraTitle}
      className="m-auto max-h-[100dvh] w-[min(100vw-2rem,30rem)] bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="p-4 sm:p-5">
        <h2 className="font-display text-[1.25rem] leading-tight">{t.cameraTitle}</h2>
        <div className="relative mt-3 aspect-[4/5] w-full overflow-hidden bg-[#0f1626]">
          {/* Mirrored like a mirror; muted and inline so it plays everywhere. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 size-full -scale-x-100 object-cover ${state === 'live' ? '' : 'invisible'}`}
          />
          {state === 'captured' && shot && (
            <img src={shot.url} alt="" className="absolute inset-0 size-full -scale-x-100 object-cover" />
          )}
          {(state === 'starting' || state === 'error') && (
            <p
              className="absolute inset-0 grid place-items-center p-6 text-center text-body text-paper/85"
              role={state === 'error' ? 'alert' : 'status'}
            >
              {state === 'error' ? error : t.cameraStarting}
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {state === 'captured' ? (
            <>
              <button type="button" onClick={use} className="btn btn-primary">
                {t.useShot}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShot(null);
                  setState('live');
                }}
                className="btn btn-secondary"
              >
                {t.retake}
              </button>
            </>
          ) : (
            <button type="button" onClick={capture} disabled={state !== 'live'} className="btn btn-primary">
              {t.capture}
            </button>
          )}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="link-ink tap meta min-h-[44px] text-ink"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
