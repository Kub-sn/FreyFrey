// Generic playing card helpers: 52 card deck, deterministic shuffling and German labels.

export const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'] as const;
export type Suit = (typeof SUITS)[number];

export type Card = {
  rank: number; // 2..14 (11 = Bube, 12 = Dame, 13 = König, 14 = Ass)
  suit: Suit;
};

export const ACE_RANK = 14;

const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

export const SUIT_LABELS: Record<Suit, string> = {
  hearts: 'Herz',
  diamonds: 'Karo',
  spades: 'Pik',
  clubs: 'Kreuz',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣',
};

const RANK_NAMES: Record<number, string> = {
  11: 'Bube',
  12: 'Dame',
  13: 'König',
  14: 'Ass',
};

const RANK_SHORT: Record<number, string> = {
  11: 'B',
  12: 'D',
  13: 'K',
  14: 'A',
};

export function isRedCard(card: Card) {
  return RED_SUITS.includes(card.suit);
}

export function getRankLabel(rank: number) {
  return RANK_NAMES[rank] ?? String(rank);
}

export function getRankShort(rank: number) {
  return RANK_SHORT[rank] ?? String(rank);
}

export function getCardLabel(card: Card) {
  return `${SUIT_LABELS[card.suit]} ${getRankLabel(card.rank)}`;
}

/** Comparable value of a card: the ace is either the highest (14) or the lowest (1) card. */
export function getCardValue(card: Card, aceHigh: boolean) {
  return card.rank === ACE_RANK && !aceHigh ? 1 : card.rank;
}

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({ rank: index + 2, suit })),
  );
}

// mulberry32: small deterministic PRNG so game state (incl. seed) can be persisted and tested.
export function nextRandom(seed: number): [number, number] {
  const nextSeed = (seed + 0x6d2b79f5) >>> 0;
  let t = nextSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  return [value, nextSeed];
}

export function shuffleDeck(cards: Card[], seed: number): { cards: Card[]; seed: number } {
  const shuffled = [...cards];
  let currentSeed = seed;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const [value, nextSeed] = nextRandom(currentSeed);
    currentSeed = nextSeed;
    const swapIndex = Math.floor(value * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return { cards: shuffled, seed: currentSeed };
}

/** Draws the top card; an empty deck is replaced by a freshly shuffled full deck. */
export function drawCard(deck: Card[], seed: number): { card: Card; deck: Card[]; seed: number } {
  if (deck.length > 0) {
    const [card, ...rest] = deck;
    return { card, deck: rest, seed };
  }

  const reshuffled = shuffleDeck(createDeck(), seed);
  const [card, ...rest] = reshuffled.cards;
  return { card, deck: rest, seed: reshuffled.seed };
}

export function isCard(value: unknown): value is Card {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const card = value as Partial<Card>;
  return typeof card.rank === 'number'
    && card.rank >= 2
    && card.rank <= ACE_RANK
    && SUITS.includes(card.suit as Suit);
}

export function isCardList(value: unknown): value is Card[] {
  return Array.isArray(value) && value.every(isCard);
}
