import { describe, expect, it } from 'vitest';
import {
  advanceGifQueue,
  DEFAULT_GIF_DURATION_MS,
  FAIL_GIFS,
  getGifDisplayMs,
  MAX_GIF_DISPLAY_MS,
  MIN_GIF_DISPLAY_MS,
  parseGifDurationMs,
  shuffledIndices,
} from './failGifs';

function sequence(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('failGifs', () => {
  it('bundles all reaction GIFs with their loop durations', () => {
    expect(FAIL_GIFS).toHaveLength(9);
    expect(FAIL_GIFS.every((gif) => gif.src.length > 0)).toBe(true);
    expect(FAIL_GIFS.map((gif) => gif.durationMs)).toContain(10_070);
  });

  it('reads the loop duration from the file name', () => {
    expect(parseGifDurationMs('/assets/party_4200ms.webp')).toBe(4200);
    expect(parseGifDurationMs('/assets/party.gif')).toBe(DEFAULT_GIF_DURATION_MS);
  });

  it('shows short GIFs at least 2.5 s and cuts long ones at 5 s', () => {
    expect(getGifDisplayMs({ src: 'a', durationMs: 1_070 })).toBe(MIN_GIF_DISPLAY_MS);
    expect(getGifDisplayMs({ src: 'a', durationMs: 3_360 })).toBe(3_360);
    expect(getGifDisplayMs({ src: 'a', durationMs: 10_070 })).toBe(MAX_GIF_DISPLAY_MS);
  });

  it('shows every GIF once per round in shuffled order and never repeats one back to back', () => {
    let queue = shuffledIndices(4, sequence([0.9, 0.1, 0.5]));
    expect([...queue].sort()).toEqual([0, 1, 2, 3]);

    const shown: number[] = [];
    for (let step = 0; step < 12; step += 1) {
      shown.push(queue[0]);
      queue = advanceGifQueue(queue, 4, sequence([0.99, 0.99, 0.99]));
    }

    for (let round = 0; round < 3; round += 1) {
      expect([...shown.slice(round * 4, round * 4 + 4)].sort()).toEqual([0, 1, 2, 3]);
    }
    shown.slice(1).forEach((index, position) => expect(index).not.toBe(shown[position]));
  });
});
