import type { CSSProperties } from 'react';

const CONFETTI_COLORS = ['#19624d', '#c8472d', '#e0a526', '#db8e95', '#3a6557', '#f46f3a'];

/** Deterministic confetti burst: evenly spread angles with alternating distances. */
export function createConfetti(count: number, distance: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const reach = index % 2 === 0 ? distance : distance * 0.7;

    return {
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      delay: `${(index % 4) * 40}ms`,
      style: {
        '--dx': `${Math.round(Math.cos(angle) * reach)}px`,
        '--dy': `${Math.round(Math.sin(angle) * reach)}px`,
        '--rot': `${(index % 2 === 0 ? 1 : -1) * (180 + index * 30)}deg`,
      } as CSSProperties,
    };
  });
}
