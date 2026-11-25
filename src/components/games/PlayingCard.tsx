import { cn } from '../../lib/classnames';
import { type Card, getCardLabel, getRankShort, isRedCard, SUIT_SYMBOLS } from '../../lib/cards';

type CardSize = 'sm' | 'md' | 'lg';

const sizeClassNames: Record<CardSize, string> = {
  sm: 'h-14 w-10 rounded-[8px] text-[0.8rem]',
  md: 'h-24 w-16 rounded-[12px] text-[1rem]',
  lg: 'h-36 w-24 rounded-[16px] text-[1.3rem]',
};

const symbolClassNames: Record<CardSize, string> = {
  sm: 'text-[1.15rem]',
  md: 'text-[2rem]',
  lg: 'text-[3.1rem]',
};

export function PlayingCard({
  card,
  className,
  highlighted = false,
  size = 'md',
}: {
  card: Card | null;
  className?: string;
  highlighted?: boolean;
  size?: CardSize;
}) {
  if (!card) {
    return (
      <div
        role="img"
        aria-label="Verdeckte Karte"
        className={cn(
          'shrink-0 border-2 border-[#f6efe2] bg-[repeating-linear-gradient(45deg,#19624d_0_6px,#1f7259_6px_12px)] shadow-[0_8px_18px_rgba(24,52,47,0.18)]',
          sizeClassNames[size],
          highlighted && 'ring-4 ring-[rgba(200,71,45,0.45)]',
          className,
        )}
      />
    );
  }

  const rank = getRankShort(card.rank);
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      role="img"
      aria-label={getCardLabel(card)}
      className={cn(
        'relative grid shrink-0 place-items-center border border-[rgba(24,52,47,0.16)] bg-white font-bold shadow-[0_8px_18px_rgba(24,52,47,0.14)]',
        isRedCard(card) ? 'text-[#c8472d]' : 'text-[#18342f]',
        sizeClassNames[size],
        highlighted && 'ring-4 ring-[rgba(25,98,77,0.45)]',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute left-[0.3em] top-[0.15em] leading-none">
        {rank}
      </span>
      <span aria-hidden="true" className={cn('leading-none', symbolClassNames[size])}>
        {symbol}
      </span>
      <span aria-hidden="true" className="absolute bottom-[0.15em] right-[0.3em] rotate-180 leading-none">
        {rank}
      </span>
    </div>
  );
}
