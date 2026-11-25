// Pure game logic for the "Busfahrer" drinking game (pass-and-play on one device).
//
// Münchner Variante (default):
//   9 open cards are laid out as a diamond (rows of 1-2-3-2-1). The player on turn picks the
//   first or last card of a row and guesses whether the next drawn card is higher, equal or lower.
//   On a correct guess the drawn card is laid next to the compared card, so the row grows. A wrong
//   guess costs as many sips as the row had cards; the drawn card stays as the only card of that row
//   and all other cards of the row are shuffled back into the deck. The player starts over and every
//   new start has to be in one of the longest rows. Guessing "equal" correctly is still a correct guess,
//   but the player has to down their beer ("Bierle exen"). After 3 correct guesses in a row the player may pass to the next player or keep
//   going voluntarily. The game is open-ended, an empty deck is reshuffled.
//
// Klassische Variante:
// 1. Fragerunde: 4 rounds, every player answers one question per round and keeps the drawn card.
//    Right answer -> the player hands out <round> sips, wrong answer -> the player drinks <round> sips.
// 2. Pyramide: 10 cards in rows of 4/3/2/1 are revealed bottom-up. Every player holding cards of the
//    revealed rank lays them down and hands out <row> sips per card.
// 3. Busfahrt: the player with the most cards left (tie: higher card sum, then seat order) drives the bus
//    and has to guess higher/lower for 4 cards in a row. Equal counts as wrong. A wrong guess costs as
//    many sips as cards were already in the row and the ride starts over from the wrong card.
//
// In both variants the ace is either the highest or the lowest card (chosen at setup).

import {
  type Card,
  createDeck,
  drawCard,
  getCardValue,
  isCard,
  isCardList,
  isRedCard,
  nextRandom,
  shuffleDeck,
  SUITS,
  type Suit,
} from './cards';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export type BusfahrerVariant = 'muenchen' | 'klassisch';
export const DEFAULT_VARIANT: BusfahrerVariant = 'muenchen';

export type BusfahrerSettings = {
  variant: BusfahrerVariant;
  aceHigh: boolean;
};

export const DEFAULT_SETTINGS: BusfahrerSettings = {
  variant: DEFAULT_VARIANT,
  aceHigh: true,
};

export type GamePlayer = {
  name: string;
  hand: Card[];
};

type BaseState = {
  players: GamePlayer[];
  deck: Card[];
  seed: number;
  aceHigh: boolean;
};

// ---------------------------------------------------------------------------
// Münchner Variante (Raute)
// ---------------------------------------------------------------------------

export const RAUTE_ROW_SIZES = [1, 2, 3, 2, 1] as const;
export const RAUTE_STREAK_TO_PASS = 3;

export type RauteEnd = 'start' | 'end';
export type RauteGuess = 'higher' | 'equal' | 'lower';

export type RauteResult = {
  playerIndex: number;
  row: number;
  end: RauteEnd;
  guess: RauteGuess;
  compared: Card;
  card: Card;
  correct: boolean;
  sips: number;
};

export type RauteState = BaseState & {
  phase: 'raute';
  rows: Card[][];
  playerIndex: number;
  streak: number;
  guesses: number;
  sipsByPlayer: number[];
  lastResult: RauteResult | null;
};

// ---------------------------------------------------------------------------
// Klassische Variante
// ---------------------------------------------------------------------------

export const QUESTION_ROUNDS = 4;
export const PYRAMID_ROW_SIZES = [4, 3, 2, 1] as const;
export const BUS_RIDE_LENGTH = 5;

export type QuestionRound = 1 | 2 | 3 | 4;
export type QuestionGuess = 'red' | 'black' | 'higher' | 'lower' | 'inside' | 'outside' | Suit;
export type BusGuess = 'higher' | 'lower';

export type QuestionResult = {
  playerIndex: number;
  round: QuestionRound;
  guess: QuestionGuess;
  card: Card;
  correct: boolean;
  sips: number;
};

export type PyramidCard = {
  card: Card;
  row: number; // 1 = bottom row (1 sip) ... 4 = top (4 sips)
  revealed: boolean;
};

export type PyramidMatch = {
  playerIndex: number;
  cards: Card[];
  sips: number;
};

export type PyramidReveal = {
  index: number;
  matches: PyramidMatch[];
};

export type QuestionsState = BaseState & {
  phase: 'questions';
  round: QuestionRound;
  playerIndex: number;
  result: QuestionResult | null;
};

export type PyramidState = BaseState & {
  phase: 'pyramid';
  pyramid: PyramidCard[];
  lastReveal: PyramidReveal | null;
};

export type BusState = BaseState & {
  phase: 'bus';
  driverIndex: number;
  ride: Card[];
  attempts: number;
  sipsDrunk: number;
  lastMiss: { card: Card; sips: number } | null;
};

export type FinishedState = BaseState & {
  phase: 'finished';
  driverIndex: number | null;
  ride: Card[];
  attempts: number;
  sipsDrunk: number;
};

export type ClassicState = QuestionsState | PyramidState | BusState | FinishedState;
export type BusfahrerState = RauteState | ClassicState;

export type BusfahrerAction =
  | { type: 'guessRaute'; row: number; end: RauteEnd; guess: RauteGuess }
  | { type: 'passTurn' }
  | { type: 'answer'; guess: QuestionGuess }
  | { type: 'nextTurn' }
  | { type: 'revealPyramidCard' }
  | { type: 'startBus' }
  | { type: 'guessBus'; guess: BusGuess };

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function formatSips(sips: number) {
  return sips === 1 ? '1 Schluck' : `${sips} Schlucke`;
}

export function normalizePlayerNames(names: string[]) {
  return names.map((name) => name.trim().replace(/\s+/g, ' '));
}

export function validatePlayerNames(names: string[]): string | null {
  const normalized = normalizePlayerNames(names);

  if (normalized.length < MIN_PLAYERS) {
    return `Es braucht mindestens ${MIN_PLAYERS} Spieler.`;
  }

  if (normalized.length > MAX_PLAYERS) {
    return `Es können höchstens ${MAX_PLAYERS} Spieler mitspielen.`;
  }

  if (normalized.some((name) => !name)) {
    return 'Bitte gib allen Spielern einen Namen.';
  }

  const lowerCased = normalized.map((name) => name.toLocaleLowerCase('de-DE'));

  if (new Set(lowerCased).size !== lowerCased.length) {
    return 'Jeder Name darf nur einmal vorkommen.';
  }

  return null;
}

export function createGame(
  names: string[],
  seed: number,
  settings: BusfahrerSettings = DEFAULT_SETTINGS,
): RauteState | QuestionsState {
  const validationError = validatePlayerNames(names);

  if (validationError) {
    throw new Error(validationError);
  }

  const players = normalizePlayerNames(names).map((name) => ({ name, hand: [] }));
  const shuffled = shuffleDeck(createDeck(), seed);

  if (settings.variant === 'klassisch') {
    return {
      phase: 'questions',
      players,
      deck: shuffled.cards,
      seed: shuffled.seed,
      aceHigh: settings.aceHigh,
      round: 1,
      playerIndex: 0,
      result: null,
    };
  }

  let deck = shuffled.cards;
  let currentSeed = shuffled.seed;
  const rows = RAUTE_ROW_SIZES.map((size) => Array.from({ length: size }, () => {
    const drawn = drawCard(deck, currentSeed);
    deck = drawn.deck;
    currentSeed = drawn.seed;
    return drawn.card;
  }));

  const [startValue, nextSeed] = nextRandom(currentSeed);

  return {
    phase: 'raute',
    players,
    deck,
    seed: nextSeed,
    aceHigh: settings.aceHigh,
    rows,
    playerIndex: Math.floor(startValue * players.length),
    streak: 0,
    guesses: 0,
    sipsByPlayer: players.map(() => 0),
    lastResult: null,
  };
}

// ---------------------------------------------------------------------------
// Münchner Variante – rules
// ---------------------------------------------------------------------------

/** Rows the player may pick from: a (re)start has to be in one of the longest rows. */
export function getSelectableRauteRows(state: RauteState): number[] {
  const allRows = state.rows.map((_, index) => index);

  if (state.streak > 0) {
    return allRows;
  }

  const longest = Math.max(...state.rows.map((row) => row.length));
  return allRows.filter((index) => state.rows[index].length === longest);
}

export function getRauteEndCard(row: Card[], end: RauteEnd) {
  return end === 'start' ? row[0] : row[row.length - 1];
}

/** A correct "gleich" guess: counts as a hit, but the player has to down their beer. */
export function isBierleExen(result: Pick<RauteResult, 'correct' | 'guess'>) {
  return result.correct && result.guess === 'equal';
}

export function canPassTurn(state: RauteState) {
  return state.streak >= RAUTE_STREAK_TO_PASS;
}

export function isRauteGuessCorrect(compared: Card, drawn: Card, guess: RauteGuess, aceHigh: boolean) {
  const comparedValue = getCardValue(compared, aceHigh);
  const drawnValue = getCardValue(drawn, aceHigh);
  const actual: RauteGuess = drawnValue > comparedValue ? 'higher' : drawnValue < comparedValue ? 'lower' : 'equal';

  return guess === actual;
}

function reduceRaute(state: RauteState, action: BusfahrerAction): BusfahrerState {
  switch (action.type) {
    case 'guessRaute': {
      if (!getSelectableRauteRows(state).includes(action.row)) {
        return state;
      }

      const row = state.rows[action.row];
      const compared = getRauteEndCard(row, action.end);
      const drawn = drawCard(state.deck, state.seed);
      const correct = isRauteGuessCorrect(compared, drawn.card, action.guess, state.aceHigh);
      // The price of a row is its size at the moment of guessing.
      const sips = row.length;
      let nextRow: Card[];
      let deck = drawn.deck;
      let seed = drawn.seed;

      if (correct) {
        nextRow = action.end === 'start' ? [drawn.card, ...row] : [...row, drawn.card];
      } else {
        // Miss: only the drawn card stays, the rest of the row goes back into the deck at random.
        nextRow = [drawn.card];
        const reshuffled = shuffleDeck([...drawn.deck, ...row], drawn.seed);
        deck = reshuffled.cards;
        seed = reshuffled.seed;
      }

      return {
        ...state,
        deck,
        seed,
        rows: state.rows.map((entry, index) => (index === action.row ? nextRow : entry)),
        streak: correct ? state.streak + 1 : 0,
        guesses: state.guesses + 1,
        sipsByPlayer: correct
          ? state.sipsByPlayer
          : state.sipsByPlayer.map((total, index) => (index === state.playerIndex ? total + sips : total)),
        lastResult: {
          playerIndex: state.playerIndex,
          row: action.row,
          end: action.end,
          guess: action.guess,
          compared,
          card: drawn.card,
          correct,
          sips,
        },
      };
    }

    case 'passTurn': {
      if (!canPassTurn(state)) {
        return state;
      }

      return {
        ...state,
        playerIndex: (state.playerIndex + 1) % state.players.length,
        streak: 0,
        lastResult: null,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Klassische Variante – rules
// ---------------------------------------------------------------------------

export function getAllowedGuesses(round: QuestionRound): QuestionGuess[] {
  switch (round) {
    case 1:
      return ['red', 'black'];
    case 2:
      return ['higher', 'lower'];
    case 3:
      return ['inside', 'outside'];
    case 4:
      return [...SUITS];
  }
}

export function isQuestionGuessCorrect(
  round: QuestionRound,
  hand: Card[],
  card: Card,
  guess: QuestionGuess,
  aceHigh = true,
) {
  const value = getCardValue(card, aceHigh);

  switch (round) {
    case 1:
      return guess === (isRedCard(card) ? 'red' : 'black');
    case 2: {
      const reference = hand[0];
      if (!reference) {
        return false;
      }
      const referenceValue = getCardValue(reference, aceHigh);
      if (value === referenceValue) {
        return false;
      }
      return guess === (value > referenceValue ? 'higher' : 'lower');
    }
    case 3: {
      const [first, second] = hand;
      if (!first || !second) {
        return false;
      }
      const firstValue = getCardValue(first, aceHigh);
      const secondValue = getCardValue(second, aceHigh);
      const low = Math.min(firstValue, secondValue);
      const high = Math.max(firstValue, secondValue);
      if (value === low || value === high) {
        return false;
      }
      return guess === (value > low && value < high ? 'inside' : 'outside');
    }
    case 4:
      return guess === card.suit;
  }
}

function createPyramid(state: QuestionsState): PyramidState {
  let deck = state.deck;
  let seed = state.seed;
  const pyramid: PyramidCard[] = [];

  PYRAMID_ROW_SIZES.forEach((size, rowIndex) => {
    for (let position = 0; position < size; position += 1) {
      const drawn = drawCard(deck, seed);
      deck = drawn.deck;
      seed = drawn.seed;
      pyramid.push({ card: drawn.card, row: rowIndex + 1, revealed: false });
    }
  });

  return {
    phase: 'pyramid',
    players: state.players,
    deck,
    seed,
    aceHigh: state.aceHigh,
    pyramid,
    lastReveal: null,
  };
}

export function getHandValue(hand: Card[], aceHigh = true) {
  return hand.reduce((total, card) => total + getCardValue(card, aceHigh), 0);
}

/** Returns the index of the bus driver, or null when nobody has cards left. */
export function determineDriver(players: GamePlayer[], aceHigh = true): number | null {
  let driverIndex: number | null = null;

  players.forEach((player, index) => {
    if (player.hand.length === 0) {
      return;
    }

    if (driverIndex === null) {
      driverIndex = index;
      return;
    }

    const current = players[driverIndex];

    if (
      player.hand.length > current.hand.length
      || (
        player.hand.length === current.hand.length
        && getHandValue(player.hand, aceHigh) > getHandValue(current.hand, aceHigh)
      )
    ) {
      driverIndex = index;
    }
  });

  return driverIndex;
}

function reduceClassic(state: ClassicState, action: BusfahrerAction): BusfahrerState {
  switch (action.type) {
    case 'answer': {
      if (state.phase !== 'questions' || state.result) {
        return state;
      }

      if (!getAllowedGuesses(state.round).includes(action.guess)) {
        return state;
      }

      const player = state.players[state.playerIndex];
      const drawn = drawCard(state.deck, state.seed);
      const correct = isQuestionGuessCorrect(state.round, player.hand, drawn.card, action.guess, state.aceHigh);

      return {
        ...state,
        deck: drawn.deck,
        seed: drawn.seed,
        players: state.players.map((entry, index) => (
          index === state.playerIndex ? { ...entry, hand: [...entry.hand, drawn.card] } : entry
        )),
        result: {
          playerIndex: state.playerIndex,
          round: state.round,
          guess: action.guess,
          card: drawn.card,
          correct,
          sips: state.round,
        },
      };
    }

    case 'nextTurn': {
      if (state.phase !== 'questions' || !state.result) {
        return state;
      }

      const isLastPlayer = state.playerIndex === state.players.length - 1;

      if (!isLastPlayer) {
        return { ...state, playerIndex: state.playerIndex + 1, result: null };
      }

      if (state.round < QUESTION_ROUNDS) {
        return { ...state, round: (state.round + 1) as QuestionRound, playerIndex: 0, result: null };
      }

      return createPyramid(state);
    }

    case 'revealPyramidCard': {
      if (state.phase !== 'pyramid') {
        return state;
      }

      const index = state.pyramid.findIndex((entry) => !entry.revealed);

      if (index === -1) {
        return state;
      }

      const revealed = state.pyramid[index];
      const matches: PyramidMatch[] = [];

      const players = state.players.map((player, playerIndex) => {
        const matchingCards = player.hand.filter((card) => card.rank === revealed.card.rank);

        if (matchingCards.length === 0) {
          return player;
        }

        matches.push({ playerIndex, cards: matchingCards, sips: matchingCards.length * revealed.row });
        return { ...player, hand: player.hand.filter((card) => card.rank !== revealed.card.rank) };
      });

      return {
        ...state,
        players,
        pyramid: state.pyramid.map((entry, entryIndex) => (
          entryIndex === index ? { ...entry, revealed: true } : entry
        )),
        lastReveal: { index, matches },
      };
    }

    case 'startBus': {
      if (state.phase !== 'pyramid' || state.pyramid.some((entry) => !entry.revealed)) {
        return state;
      }

      const driverIndex = determineDriver(state.players, state.aceHigh);

      if (driverIndex === null) {
        return {
          phase: 'finished',
          players: state.players,
          deck: state.deck,
          seed: state.seed,
          aceHigh: state.aceHigh,
          driverIndex: null,
          ride: [],
          attempts: 0,
          sipsDrunk: 0,
        };
      }

      // The bus ride uses a freshly shuffled full deck.
      const shuffled = shuffleDeck(createDeck(), state.seed);
      const drawn = drawCard(shuffled.cards, shuffled.seed);

      return {
        phase: 'bus',
        players: state.players,
        deck: drawn.deck,
        seed: drawn.seed,
        aceHigh: state.aceHigh,
        driverIndex,
        ride: [drawn.card],
        attempts: 1,
        sipsDrunk: 0,
        lastMiss: null,
      };
    }

    case 'guessBus': {
      if (state.phase !== 'bus') {
        return state;
      }

      const previousValue = getCardValue(state.ride[state.ride.length - 1], state.aceHigh);
      const drawn = drawCard(state.deck, state.seed);
      const drawnValue = getCardValue(drawn.card, state.aceHigh);
      const correct = drawnValue !== previousValue
        && action.guess === (drawnValue > previousValue ? 'higher' : 'lower');

      if (!correct) {
        const sips = state.ride.length;

        return {
          ...state,
          deck: drawn.deck,
          seed: drawn.seed,
          ride: [drawn.card],
          attempts: state.attempts + 1,
          sipsDrunk: state.sipsDrunk + sips,
          lastMiss: { card: drawn.card, sips },
        };
      }

      const ride = [...state.ride, drawn.card];

      if (ride.length >= BUS_RIDE_LENGTH) {
        return {
          phase: 'finished',
          players: state.players,
          deck: drawn.deck,
          seed: drawn.seed,
          aceHigh: state.aceHigh,
          driverIndex: state.driverIndex,
          ride,
          attempts: state.attempts,
          sipsDrunk: state.sipsDrunk,
        };
      }

      return {
        ...state,
        deck: drawn.deck,
        seed: drawn.seed,
        ride,
        lastMiss: null,
      };
    }

    default:
      return state;
  }
}

export function busfahrerReducer(state: BusfahrerState, action: BusfahrerAction): BusfahrerState {
  return state.phase === 'raute' ? reduceRaute(state, action) : reduceClassic(state, action);
}

// ---------------------------------------------------------------------------
// Restoring persisted games
// ---------------------------------------------------------------------------

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Light structural check for game state restored from local storage. Games saved before the
 * ace option existed have no `aceHigh`; they are migrated to "ace high" (the old behaviour).
 */
export function parseBusfahrerState(value: unknown): BusfahrerState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const state = { ...raw, aceHigh: typeof raw.aceHigh === 'boolean' ? raw.aceHigh : true } as Partial<BusfahrerState> & Record<string, unknown>;

  if (
    !Array.isArray(state.players)
    || state.players.length < MIN_PLAYERS
    || state.players.length > MAX_PLAYERS
    || !state.players.every((player) => typeof player?.name === 'string' && isCardList(player.hand))
    || !isCardList(state.deck)
    || typeof state.seed !== 'number'
  ) {
    return null;
  }

  const playerCount = state.players.length;
  const isValidPlayerIndex = (index: unknown) => isNonNegativeInteger(index) && index < playerCount;

  switch (state.phase) {
    case 'raute': {
      const valid = Array.isArray(state.rows)
        && state.rows.length === RAUTE_ROW_SIZES.length
        && state.rows.every((row) => isCardList(row) && row.length > 0)
        && isValidPlayerIndex(state.playerIndex)
        && isNonNegativeInteger(state.streak)
        && isNonNegativeInteger(state.guesses)
        && Array.isArray(state.sipsByPlayer)
        && state.sipsByPlayer.length === playerCount
        && state.sipsByPlayer.every(isNonNegativeInteger);
      return valid ? (state as RauteState) : null;
    }
    case 'questions': {
      const valid = isNonNegativeInteger(state.round)
        && state.round >= 1
        && state.round <= QUESTION_ROUNDS
        && isValidPlayerIndex(state.playerIndex);
      return valid ? (state as QuestionsState) : null;
    }
    case 'pyramid': {
      const valid = Array.isArray(state.pyramid)
        && state.pyramid.length === PYRAMID_ROW_SIZES.reduce((total, size) => total + size, 0)
        && state.pyramid.every((entry) => isCard((entry as PyramidCard)?.card));
      return valid ? (state as PyramidState) : null;
    }
    case 'bus': {
      const valid = isValidPlayerIndex(state.driverIndex)
        && isCardList(state.ride)
        && state.ride.length > 0;
      return valid ? (state as BusState) : null;
    }
    case 'finished':
      return isCardList(state.ride) ? (state as FinishedState) : null;
    default:
      return null;
  }
}
