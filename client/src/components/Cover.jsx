import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { COVER, COVER_RATIO, headlineScale } from '../lib/coverLayout';
import { barcodeBars, issueFor } from '../lib/issue';
import { supportsWebGL2 } from '../lib/capabilities';
import EffectBoundary from './effects/EffectBoundary';
import { isOwnImageUrl } from '../lib/imageUrls';

// The shader library only loads when a cover actually prints a photo.
const loadHalftone = () => import('./effects/HalftoneReveal');
const HalftoneReveal = lazy(loadHalftone);

// Size as a fraction of the cover width, with an optional on-screen floor so
// small print stays legible on a 300px phone cover. The canvas export is
// 1080px wide and never needs the floor.
const cqw = (fraction, minPx) => {
  const size = `${(fraction * 100).toFixed(3)}cqw`;
  return minPx ? `max(${size}, ${minPx}px)` : size;
};

// Darkroom safelight. Amber-red because that is what a real safelight is;
// it belongs to the darkroom metaphor, not to the page palette.
export const SAFELIGHT = 'rgba(214, 92, 38, 0.38)';

/**
 * The magazine cover: the product itself and the one bold element in the
 * design. Sized in container units so it is the same composition at any
 * width, and so it matches the canvas export in lib/coverCanvas.js.
 *
 * imageStatus: 'pending' (darkroom, safelight breathing), 'ready' (the photo
 * develops in once its bytes have actually decoded), 'failed' (runs without a
 * photo, still complete). specimen: the landing-page sample; no status text.
 * deck: replaces the bottom line (the loading page has no score yet).
 * reveal: 'press' prints the photo in CMYK halftone first (WebGL2); 'develop'
 * is the darkroom fade. printing: misregistered plates and a print-head scan
 * line, for the loading page. onRevealed fires once the photo is fully shown.
 * lazy: a cover in a long list (the back issues) loads its photo only near
 * the viewport, which keeps a gallery visit inside the bandwidth budget.
 */
export default function Cover({
  title,
  imageUrl,
  imageStatus = 'failed',
  personName,
  happiness,
  specimen = false,
  deck = null,
  reveal = 'develop',
  printing = false,
  onRevealed,
  lazy = false,
  className = '',
}) {
  const reduce = useReducedMotion();
  const issue = issueFor();
  const bars = barcodeBars(title);
  // Tracks which URL has decoded rather than a boolean, so a new photo starts
  // undeveloped without an effect that could race a cached image's onLoad.
  const [loadedUrl, setLoadedUrl] = useState(null);
  // HEAD saying "ready" does not guarantee the GET succeeds (dropped
  // connection, proxy error). A failed download settles the cover as
  // photo-less instead of leaving it dark with nothing happening.
  const [failedUrl, setFailedUrl] = useState(null);
  const photoFailed = failedUrl === imageUrl;
  const status = photoFailed ? 'failed' : imageStatus;
  const wantPhoto = status === 'ready' && Boolean(imageUrl);
  const loaded = loadedUrl === imageUrl;
  const imgRef = useRef(null);
  const [revealedUrl, setRevealedUrl] = useState(null);
  // Only our own image route promises CORS headers. Legacy rows can point at
  // a third-party CDN; requesting those in CORS mode would fail outright if
  // the host stopped sending the header, so they load plainly and skip the
  // press (WebGL needs a CORS-clean texture). The PNG export already retries
  // without the photo when a canvas is tainted.
  const corsSafe = isOwnImageUrl(imageUrl);
  const press = reveal === 'press' && corsSafe && !reduce && supportsWebGL2();
  const pressing = press && wantPhoto && loaded && revealedUrl !== imageUrl;

  // Shared by the normal ending and the error fallback: either way the real
  // photo is shown and the caller hears that the cover is complete.
  const finishPress = () => {
    setRevealedUrl(imageUrl);
    onRevealed?.();
  };

  // Warm the shader chunk while the portrait is still being generated.
  useEffect(() => {
    if (press) loadHalftone();
  }, [press]);

  // Without the press, the photo counts as revealed once it has decoded.
  useEffect(() => {
    if (wantPhoto && loaded && !press) onRevealed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantPhoto, loaded, press]);

  // Keep the safelight on until the photo has decoded: HEAD saying "ready"
  // only means the bytes exist, and on a slow connection the download can
  // outlast the develop animation.
  const darkroom = !(wantPhoto && loaded);
  const breathing = status === 'pending' && !specimen && !reduce;

  return (
    <figure
      className={`relative isolate w-full overflow-hidden bg-[#0f1626] text-paper shadow-[0_28px_50px_-28px_rgba(19,32,58,.6)] ${className}`}
      style={{ aspectRatio: COVER_RATIO, containerType: 'inline-size' }}
      aria-label={`Magazine cover: ${title}`}
    >
      <AnimatePresence initial={false}>
        {darkroom && (
          <m.div
            key="safelight"
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{ background: `radial-gradient(60% 45% at 50% 56%, ${SAFELIGHT}, rgba(214,92,38,0) 70%)` }}
            initial={{ opacity: 1 }}
            animate={breathing ? { opacity: [0.5, 1, 0.5] } : { opacity: status === 'failed' && !specimen ? 0.35 : 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            transition={breathing ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {wantPhoto && (
        <img
          ref={imgRef}
          crossOrigin={corsSafe ? 'anonymous' : undefined}
          src={imageUrl}
          alt=""
          width={896}
          height={1120}
          fetchPriority={lazy ? 'auto' : 'high'}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={() => setLoadedUrl(imageUrl)}
          onError={() => {
            setFailedUrl(imageUrl);
            // The cover is complete without its photo; let the page move on
            // (the result page stamps it, the export renders photo-less).
            onRevealed?.();
          }}
          className={`absolute inset-0 -z-10 h-full w-full object-cover ${
            !loaded || pressing ? 'opacity-0' : press ? '' : 'develop'
          }`}
        />
      )}

      {pressing && (
        <EffectBoundary onError={finishPress}>
          <Suspense fallback={null}>
            <HalftoneReveal image={imgRef.current} onDone={finishPress} />
          </Suspense>
        </EffectBoundary>
      )}

      {printing && !reduce && (
        <div aria-hidden="true" className="print-head pointer-events-none absolute inset-x-0 top-0 z-10 h-[18%]" />
      )}

      {/* Scrims keep paper-colored type legible on any photograph. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-black/55 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/85 via-black/45 to-transparent"
      />

      <div
        className={`absolute inset-0 flex flex-col ${printing ? 'misregister' : ''}`}
        style={{ padding: cqw(COVER.pad) }}
      >
        <div>
          <p
            translate="no"
            className="font-display text-center leading-[0.82] font-semibold tracking-[-0.045em]"
            style={{
              fontSize: cqw(COVER.mastheadSize),
              marginTop: `calc(${cqw(COVER.mastheadTop)} - ${cqw(COVER.pad)})`,
            }}
          >
            CareerPredict
          </p>
          <div
            className="mt-[2.6cqw] flex items-center justify-between border-t border-paper/50 pt-[1.2cqw] font-sans font-medium"
            style={{ fontSize: cqw(COVER.issueSize, 10) }}
          >
            <span>Issue {issue.number}</span>
            {/* Dropped on a small cover (the back-issues grid on a phone), where
                three items at the legibility floor would collide. */}
            <span className="@max-[15rem]:hidden">The Forecast</span>
            <span>{issue.short}</span>
          </div>
        </div>

        {imageStatus === 'pending' && !specimen && (
          <p
            className="my-auto self-center text-center font-sans font-medium text-paper/75"
            style={{ fontSize: cqw(0.026, 11) }}
            role="status"
          >
            Developing your portrait…
          </p>
        )}

        <div className="mt-auto">
          <span
            className="inline-block bg-mark px-[1.4cqw] py-[0.5cqw] font-sans font-semibold text-ink"
            style={{ fontSize: cqw(COVER.kickerSize, 10) }}
          >
            Cover story
          </span>
          {/* A paragraph, not a heading: the figure's aria-label names the
              cover, and a heading here would sit above the page's own h1. */}
          <p
            className="font-display mt-[2cqw] leading-[0.98] font-medium tracking-[-0.03em] text-balance"
            style={{ fontSize: cqw(headlineScale(title)) }}
          >
            {title}
          </p>
          <div className="mt-[3cqw] flex items-end justify-between gap-[3cqw]">
            <p
              className="min-w-0 font-sans leading-snug break-words text-paper/85"
              style={{ fontSize: cqw(COVER.deckSize, 11) }}
            >
              {deck ?? (specimen ? 'Sample cover. Yours is shot for you.' : null)}
              {deck == null && !specimen && (
                <>
                  {personName ? <>A forecast for {personName}. </> : null}
                  Happiness index <span className="tabular">{happiness}</span>/100.
                </>
              )}
            </p>
            <div
              aria-hidden="true"
              className="barcode relative flex shrink-0 flex-col items-center overflow-hidden bg-paper px-[1.2cqw] pt-[1cqw] pb-[0.6cqw] text-ink"
              style={{ width: cqw(COVER.barcodeWidth) }}
            >
              <span className="barcode-laser" />
              <div
                className="flex w-full items-stretch justify-between"
                style={{ height: cqw(COVER.barcodeHeight * 0.62) }}
              >
                {bars.map((w, i) => (
                  <span key={i} className={i % 2 ? 'bg-transparent' : 'bg-ink'} style={{ width: `${w * 0.11}cqw` }} />
                ))}
              </div>
              <span className="tabular mt-[0.4cqw] font-sans font-semibold" style={{ fontSize: cqw(0.014) }}>
                $0.00
              </span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
