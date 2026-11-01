import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { COVER, COVER_RATIO, headlineScale } from '../lib/coverLayout';
import { barcodeBars, issueFor } from '../lib/issue';

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
 */
export default function Cover({
  title,
  imageUrl,
  imageStatus = 'failed',
  personName,
  happiness,
  specimen = false,
  deck = null,
  className = '',
}) {
  const reduce = useReducedMotion();
  const issue = issueFor();
  const bars = barcodeBars(title);
  // Tracks which URL has decoded rather than a boolean, so a new photo starts
  // undeveloped without an effect that could race a cached image's onLoad.
  const [loadedUrl, setLoadedUrl] = useState(null);
  const wantPhoto = imageStatus === 'ready' && Boolean(imageUrl);
  const loaded = loadedUrl === imageUrl;

  // Keep the safelight on until the photo has decoded: HEAD saying "ready"
  // only means the bytes exist, and on a slow connection the download can
  // outlast the develop animation.
  const darkroom = !(wantPhoto && loaded);
  const breathing = imageStatus === 'pending' && !specimen && !reduce;

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
            animate={
              breathing ? { opacity: [0.5, 1, 0.5] } : { opacity: imageStatus === 'failed' && !specimen ? 0.35 : 1 }
            }
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            transition={breathing ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {wantPhoto && (
        <img
          src={imageUrl}
          alt=""
          width={896}
          height={1120}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setLoadedUrl(imageUrl)}
          className={`absolute inset-0 -z-10 h-full w-full object-cover ${loaded ? 'develop' : 'opacity-0'}`}
        />
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

      <div className="absolute inset-0 flex flex-col" style={{ padding: cqw(COVER.pad) }}>
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
            <span>The Forecast</span>
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
              className="flex shrink-0 flex-col items-center bg-paper px-[1.2cqw] pt-[1cqw] pb-[0.6cqw] text-ink"
              style={{ width: cqw(COVER.barcodeWidth) }}
            >
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
