import type { AnimationEvent } from 'react';
import { cn } from '../../lib/classnames';
import { formatSips, isBierleExen, type RauteResult } from '../../lib/busfahrer';
import { createConfetti } from './confetti';
import { type FailGif, getGifDisplayMs } from './failGifs';
import { PlayingCard } from './PlayingCard';

const BIG_CONFETTI = createConfetti(14, 150);

const BUBBLES = [
  { left: '18%', delay: '0ms' },
  { left: '42%', delay: '350ms' },
  { left: '64%', delay: '150ms' },
  { left: '80%', delay: '500ms' },
];

// Overlay fade in/out on top of the GIF's own display time.
const OVERLAY_FADE_MS = 600;
const EXEN_OVERLAY_MS = 2_200;

/**
 * Full-screen moment after a miss (reaction GIF) or a "Bierle exen". Closes itself when its
 * fade-out animation ends, or earlier on tap. Purely visual: the status line shows the result too.
 */
export function GuessOverlay({
  result,
  gif,
  onDone,
}: {
  result: RauteResult;
  gif: FailGif | null;
  onDone: () => void;
}) {
  const exen = isBierleExen(result);
  const durationMs = !exen && gif ? getGifDisplayMs(gif) + OVERLAY_FADE_MS : EXEN_OVERLAY_MS;

  const handleAnimationEnd = (event: AnimationEvent<HTMLButtonElement>) => {
    // Child animations bubble up; only the overlay's own fade-out closes it.
    if (event.target === event.currentTarget) {
      onDone();
    }
  };

  return (
    <button
      type="button"
      aria-label="Animation überspringen"
      className="fixed inset-0 z-50 grid animate-game-overlay cursor-pointer place-items-center overflow-hidden border-0 bg-[rgba(24,52,47,0.72)] p-6 backdrop-blur-[2px]"
      style={{ animationDuration: `${durationMs}ms` }}
      onClick={onDone}
      onAnimationEnd={handleAnimationEnd}
    >
      <div aria-hidden="true" className="relative grid justify-items-center gap-4">
        {exen ? (
          <>
            <div className="pointer-events-none absolute left-1/2 top-[38%]">
              {BIG_CONFETTI.map((particle, index) => (
                <span
                  key={index}
                  className="absolute block h-3 w-2 animate-confetti rounded-[2px] motion-reduce:hidden"
                  style={{ ...particle.style, backgroundColor: particle.color, animationDelay: particle.delay }}
                />
              ))}
            </div>
            <div className="relative">
              <span className="block animate-wobble text-[5.5rem] leading-none motion-reduce:animate-none">🍺</span>
              {BUBBLES.map((bubble) => (
                <span
                  key={bubble.left}
                  className="absolute top-2 block size-3 animate-bubble rounded-full bg-[rgba(255,244,214,0.85)] motion-reduce:hidden"
                  style={{ left: bubble.left, animationDelay: bubble.delay }}
                />
              ))}
            </div>
          </>
        ) : gif ? (
          <img
            src={gif.src}
            alt=""
            className="max-h-[48vh] w-[min(340px,86vw)] animate-pop-in rounded-[20px] object-contain shadow-[0_18px_40px_rgba(0,0,0,0.35)] [animation-delay:0ms] motion-reduce:animate-none"
          />
        ) : (
          <PlayingCard card={result.card} size="lg" className="animate-card-flip motion-reduce:animate-none" />
        )}

        <strong
          className={cn(
            'animate-pop-in rounded-full px-6 py-2 text-[2rem] font-extrabold leading-tight shadow-[0_12px_30px_rgba(0,0,0,0.25)] motion-reduce:animate-none',
            exen ? 'bg-[#e0a526] text-[#2f2104]' : 'bg-[#c8472d] text-[#fff7f2]',
          )}
        >
          {exen ? 'Gleich!' : 'Falsch!'}
        </strong>

        <span className="animate-pop-in text-[1.35rem] font-bold text-[#f6efe2] [text-shadow:0_2px_8px_rgba(0,0,0,0.4)] motion-reduce:animate-none">
          {exen ? 'Bierle exen!' : `${formatSips(result.sips)} trinken`}
        </span>
      </div>

      <span aria-hidden="true" className="absolute bottom-8 text-[0.8rem] text-[rgba(246,239,226,0.75)]">
        Tippen zum Überspringen
      </span>
    </button>
  );
}
