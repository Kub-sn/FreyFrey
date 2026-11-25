// Reaction GIFs shown one at a time after a wrong guess in the Münchner variant.
//
// To add more, drop .webp or .gif files into src/assets/games/busfahrer/falsch/.
// A "_<ms>ms" suffix in the file name (e.g. "party_4200ms.webp") tells the app how long one
// loop takes; without it a loop is assumed to take DEFAULT_GIF_DURATION_MS.

export type FailGif = {
  src: string;
  durationMs: number;
};

export const DEFAULT_GIF_DURATION_MS = 4_000;
export const MIN_GIF_DISPLAY_MS = 2_500;
export const MAX_GIF_DISPLAY_MS = 5_000;

const gifModules = import.meta.glob('../../assets/games/busfahrer/falsch/*.{webp,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function parseGifDurationMs(path: string) {
  const match = /_(\d+)ms\.(webp|gif)$/i.exec(path);
  return match ? Number(match[1]) : DEFAULT_GIF_DURATION_MS;
}

export const FAIL_GIFS: FailGif[] = Object.entries(gifModules)
  .sort(([first], [second]) => first.localeCompare(second))
  .map(([path, src]) => ({ src, durationMs: parseGifDurationMs(path) }));

/** Short GIFs loop until the minimum, long ones are cut off so the game keeps moving. */
export function getGifDisplayMs(gif: FailGif) {
  return Math.min(MAX_GIF_DISPLAY_MS, Math.max(MIN_GIF_DISPLAY_MS, gif.durationMs));
}

export function shuffledIndices(count: number, random: () => number = Math.random) {
  const indices = Array.from({ length: count }, (_, index) => index);

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }

  return indices;
}

/**
 * Drops the GIF that was just shown. When every GIF has been shown once, a new shuffled round
 * starts, and it never starts with the GIF that was shown last.
 */
export function advanceGifQueue(queue: number[], count: number, random: () => number = Math.random) {
  if (queue.length > 1) {
    return queue.slice(1);
  }

  const next = shuffledIndices(count, random);

  if (count > 1 && next[0] === queue[0]) {
    next.push(next.shift() as number);
  }

  return next;
}
