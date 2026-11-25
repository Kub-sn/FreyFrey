import { describe, expect, it } from 'vitest';
import {
  BUS_RIDE_LENGTH,
  type BusfahrerSettings,
  type BusState,
  busfahrerReducer,
  canPassTurn,
  createGame,
  determineDriver,
  formatSips,
  getSelectableRauteRows,
  isBierleExen,
  isQuestionGuessCorrect,
  isRauteGuessCorrect,
  parseBusfahrerState,
  type PyramidState,
  type QuestionsState,
  RAUTE_ROW_SIZES,
  type RauteState,
  validatePlayerNames,
} from './busfahrer';
import { type Card, createDeck, getCardLabel, getCardValue, shuffleDeck } from './cards';

const CLASSIC: BusfahrerSettings = { variant: 'klassisch', aceHigh: true };

const card = (rank: number, suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

function questionsState(overrides: Partial<QuestionsState> = {}): QuestionsState {
  return {
    phase: 'questions',
    players: [
      { name: 'Anna', hand: [] },
      { name: 'Ben', hand: [] },
    ],
    deck: [card(5, 'hearts'), card(9, 'clubs'), card(12, 'diamonds')],
    seed: 1,
    aceHigh: true,
    round: 1,
    playerIndex: 0,
    result: null,
    ...overrides,
  };
}

function pyramidState(overrides: Partial<PyramidState> = {}): PyramidState {
  return {
    phase: 'pyramid',
    players: [
      { name: 'Anna', hand: [card(7, 'hearts'), card(7, 'clubs'), card(3)] },
      { name: 'Ben', hand: [card(7, 'spades'), card(10)] },
    ],
    deck: [],
    seed: 1,
    aceHigh: true,
    pyramid: [
      { card: card(7, 'diamonds'), row: 1, revealed: false },
      ...Array.from({ length: 9 }, (_, index: number) => ({
        card: card(2 + (index % 4), 'diamonds'),
        row: index < 3 ? 1 : index < 6 ? 2 : index < 8 ? 3 : 4,
        revealed: true,
      })),
    ],
    lastReveal: null,
    ...overrides,
  };
}

function busState(overrides: Partial<BusState> = {}): BusState {
  return {
    phase: 'bus',
    players: [
      { name: 'Anna', hand: [card(3)] },
      { name: 'Ben', hand: [] },
    ],
    deck: [card(9), card(4), card(9, 'hearts')],
    seed: 1,
    aceHigh: true,
    driverIndex: 0,
    ride: [card(6)],
    attempts: 1,
    sipsDrunk: 0,
    lastMiss: null,
    ...overrides,
  };
}

describe('deck and shuffle', () => {
  it('creates 52 unique cards from 2 to Ass', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((entry: Card) => `${entry.suit}-${entry.rank}`)).size).toBe(52);
    expect(Math.min(...deck.map((entry: Card) => entry.rank))).toBe(2);
    expect(Math.max(...deck.map((entry: Card) => entry.rank))).toBe(14);
  });

  it('shuffles deterministically by seed without losing cards', () => {
    const first = shuffleDeck(createDeck(), 42);
    const second = shuffleDeck(createDeck(), 42);
    const other = shuffleDeck(createDeck(), 43);

    expect(first).toEqual(second);
    expect(first.cards).not.toEqual(other.cards);
    expect(first.cards).not.toEqual(createDeck());
    expect([...first.cards].sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank))
      .toEqual([...createDeck()].sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank));
  });

  it('labels cards and sips in German', () => {
    expect(getCardLabel(card(14, 'hearts'))).toBe('Herz Ass');
    expect(getCardLabel(card(10, 'clubs'))).toBe('Kreuz 10');
    expect(formatSips(1)).toBe('1 Schluck');
    expect(formatSips(3)).toBe('3 Schlucke');
  });
});

describe('validatePlayerNames', () => {
  it('accepts 2 to 6 unique, non-empty names', () => {
    expect(validatePlayerNames(['Anna', 'Ben'])).toBeNull();
    expect(validatePlayerNames(['A', 'B', 'C', 'D', 'E', 'F'])).toBeNull();
  });

  it('rejects too few, too many, empty and duplicate names', () => {
    expect(validatePlayerNames(['Anna'])).toMatch(/mindestens 2/);
    expect(validatePlayerNames(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toMatch(/höchstens 6/);
    expect(validatePlayerNames(['Anna', '   '])).toMatch(/Namen/);
    expect(validatePlayerNames(['Anna', ' anna '])).toMatch(/nur einmal/);
  });

  it('normalizes names when creating a game', () => {
    const game = createGame(['  Anna ', 'Ben   Bauer'], 7, CLASSIC);
    expect(game.players.map((player) => player.name)).toEqual(['Anna', 'Ben Bauer']);
    expect(game.deck).toHaveLength(52);
    expect(() => createGame(['Anna'], 7)).toThrow();
  });
});

describe('isQuestionGuessCorrect', () => {
  it('checks red or black', () => {
    expect(isQuestionGuessCorrect(1, [], card(5, 'hearts'), 'red')).toBe(true);
    expect(isQuestionGuessCorrect(1, [], card(5, 'diamonds'), 'black')).toBe(false);
    expect(isQuestionGuessCorrect(1, [], card(5, 'clubs'), 'black')).toBe(true);
  });

  it('checks higher or lower and treats equal as wrong', () => {
    expect(isQuestionGuessCorrect(2, [card(7)], card(9), 'higher')).toBe(true);
    expect(isQuestionGuessCorrect(2, [card(7)], card(3), 'lower')).toBe(true);
    expect(isQuestionGuessCorrect(2, [card(7)], card(3), 'higher')).toBe(false);
    expect(isQuestionGuessCorrect(2, [card(7)], card(7, 'hearts'), 'higher')).toBe(false);
    expect(isQuestionGuessCorrect(2, [card(7)], card(7, 'hearts'), 'lower')).toBe(false);
  });

  it('checks inside or outside and treats the borders as wrong', () => {
    const hand = [card(10), card(4)];
    expect(isQuestionGuessCorrect(3, hand, card(6), 'inside')).toBe(true);
    expect(isQuestionGuessCorrect(3, hand, card(12), 'outside')).toBe(true);
    expect(isQuestionGuessCorrect(3, hand, card(2), 'inside')).toBe(false);
    expect(isQuestionGuessCorrect(3, hand, card(4, 'hearts'), 'inside')).toBe(false);
    expect(isQuestionGuessCorrect(3, hand, card(10, 'hearts'), 'outside')).toBe(false);
  });

  it('checks the suit', () => {
    expect(isQuestionGuessCorrect(4, [], card(5, 'clubs'), 'clubs')).toBe(true);
    expect(isQuestionGuessCorrect(4, [], card(5, 'clubs'), 'spades')).toBe(false);
  });
});

describe('busfahrerReducer – Fragerunde', () => {
  it('draws a card into the hand and records the result with round-based sips', () => {
    const next = busfahrerReducer(questionsState(), { type: 'answer', guess: 'red' });

    expect(next.phase).toBe('questions');
    const state = next as QuestionsState;
    expect(state.players[0].hand).toEqual([card(5, 'hearts')]);
    expect(state.deck).toHaveLength(2);
    expect(state.result).toEqual(expect.objectContaining({ playerIndex: 0, correct: true, sips: 1 }));
  });

  it('ignores a second answer and answers that do not fit the round', () => {
    const answered = busfahrerReducer(questionsState(), { type: 'answer', guess: 'black' });
    expect(busfahrerReducer(answered, { type: 'answer', guess: 'red' })).toBe(answered);

    const fresh = questionsState();
    expect(busfahrerReducer(fresh, { type: 'answer', guess: 'higher' })).toBe(fresh);
    expect(busfahrerReducer(fresh, { type: 'nextTurn' })).toBe(fresh);
  });

  it('moves through players and rounds and builds a 10 card pyramid after round 4', () => {
    let state = createGame(['Anna', 'Ben', 'Cem'], 123, CLASSIC) as ReturnType<typeof busfahrerReducer>;
    const turns: string[] = [];

    for (let step = 0; step < 4 * 3; step += 1) {
      expect(state.phase).toBe('questions');
      const questions = state as QuestionsState;
      turns.push(`${questions.round}:${questions.players[questions.playerIndex].name}`);
      const guess = questions.round === 1 ? 'red' : questions.round === 2 ? 'higher' : questions.round === 3 ? 'inside' : 'hearts';
      state = busfahrerReducer(state, { type: 'answer', guess });
      state = busfahrerReducer(state, { type: 'nextTurn' });
    }

    expect(turns.slice(0, 4)).toEqual(['1:Anna', '1:Ben', '1:Cem', '2:Anna']);
    expect(state.phase).toBe('pyramid');
    const pyramid = state as PyramidState;
    expect(pyramid.players.every((player) => player.hand.length === 4)).toBe(true);
    expect(pyramid.pyramid).toHaveLength(10);
    expect(pyramid.pyramid.map((entry) => entry.row)).toEqual([1, 1, 1, 1, 2, 2, 2, 3, 3, 4]);
    expect(pyramid.pyramid.every((entry) => !entry.revealed)).toBe(true);
    expect(pyramid.deck).toHaveLength(52 - 12 - 10);
  });
});

describe('busfahrerReducer – Pyramide', () => {
  it('reveals the next card and lets matching players lay down cards for row-based sips', () => {
    const next = busfahrerReducer(pyramidState(), { type: 'revealPyramidCard' }) as PyramidState;

    expect(next.pyramid[0].revealed).toBe(true);
    expect(next.lastReveal).toEqual({
      index: 0,
      matches: [
        { playerIndex: 0, cards: [card(7, 'hearts'), card(7, 'clubs')], sips: 2 },
        { playerIndex: 1, cards: [card(7, 'spades')], sips: 1 },
      ],
    });
    expect(next.players[0].hand).toEqual([card(3)]);
    expect(next.players[1].hand).toEqual([card(10)]);
  });

  it('only starts the bus ride when every pyramid card is revealed', () => {
    const hidden = pyramidState();
    expect(busfahrerReducer(hidden, { type: 'startBus' })).toBe(hidden);

    const revealed = busfahrerReducer(hidden, { type: 'revealPyramidCard' });
    const bus = busfahrerReducer(revealed, { type: 'startBus' }) as BusState;

    expect(bus.phase).toBe('bus');
    // Anna and Ben both have one card left, Ben's 10 beats Anna's 3.
    expect(bus.driverIndex).toBe(1);
    expect(bus.ride).toHaveLength(1);
    expect(bus.attempts).toBe(1);
    expect(bus.deck).toHaveLength(51);
  });

  it('finishes without a driver when nobody has cards left', () => {
    const state = pyramidState({
      players: [
        { name: 'Anna', hand: [card(7, 'hearts')] },
        { name: 'Ben', hand: [] },
      ],
    });
    const revealed = busfahrerReducer(state, { type: 'revealPyramidCard' });
    const finished = busfahrerReducer(revealed, { type: 'startBus' });

    expect(finished).toEqual(expect.objectContaining({ phase: 'finished', driverIndex: null }));
  });
});

describe('determineDriver', () => {
  it('picks most cards, then the higher card sum, then seat order', () => {
    expect(determineDriver([
      { name: 'A', hand: [card(2), card(3)] },
      { name: 'B', hand: [card(14)] },
    ])).toBe(0);
    expect(determineDriver([
      { name: 'A', hand: [card(2), card(3)] },
      { name: 'B', hand: [card(2, 'hearts'), card(9)] },
    ])).toBe(1);
    expect(determineDriver([
      { name: 'A', hand: [card(5)] },
      { name: 'B', hand: [card(5, 'hearts')] },
    ])).toBe(0);
    expect(determineDriver([
      { name: 'A', hand: [] },
      { name: 'B', hand: [] },
    ])).toBeNull();
  });
});

describe('busfahrerReducer – Busfahrt', () => {
  it('extends the ride on a correct guess', () => {
    const next = busfahrerReducer(busState(), { type: 'guessBus', guess: 'higher' }) as BusState;

    expect(next.ride).toEqual([card(6), card(9)]);
    expect(next.lastMiss).toBeNull();
    expect(next.sipsDrunk).toBe(0);
  });

  it('restarts from the wrong card and charges sips equal to the cards already in the ride', () => {
    const state = busState({ ride: [card(6), card(8), card(11)], deck: [card(12)] });
    const next = busfahrerReducer(state, { type: 'guessBus', guess: 'lower' }) as BusState;

    expect(next.ride).toEqual([card(12)]);
    expect(next.attempts).toBe(2);
    expect(next.sipsDrunk).toBe(3);
    expect(next.lastMiss).toEqual({ card: card(12), sips: 3 });
  });

  it('treats an equal card as wrong', () => {
    const state = busState({ deck: [card(6, 'hearts')] });
    const next = busfahrerReducer(state, { type: 'guessBus', guess: 'higher' }) as BusState;

    expect(next.lastMiss).toEqual({ card: card(6, 'hearts'), sips: 1 });
  });

  it('finishes after the last correct card', () => {
    const state = busState({ ride: [card(2), card(4), card(6), card(8)], deck: [card(12)], attempts: 3, sipsDrunk: 5 });
    const next = busfahrerReducer(state, { type: 'guessBus', guess: 'higher' });

    expect(next).toEqual(expect.objectContaining({
      phase: 'finished',
      driverIndex: 0,
      attempts: 3,
      sipsDrunk: 5,
    }));
    expect((next as { ride: Card[] }).ride).toHaveLength(BUS_RIDE_LENGTH);
  });

  it('reshuffles a fresh deck when the bus deck runs out', () => {
    const next = busfahrerReducer(busState({ deck: [] }), { type: 'guessBus', guess: 'higher' }) as BusState;

    expect(next.deck).toHaveLength(51);
    expect(next.seed).not.toBe(1);
  });
});

describe('ace high or low', () => {
  it('values the ace as 14 or 1', () => {
    expect(getCardValue(card(14), true)).toBe(14);
    expect(getCardValue(card(14), false)).toBe(1);
    expect(getCardValue(card(13), false)).toBe(13);
  });

  it('applies the ace setting to the classic questions and the driver choice', () => {
    expect(isQuestionGuessCorrect(2, [card(7)], card(14), 'higher', true)).toBe(true);
    expect(isQuestionGuessCorrect(2, [card(7)], card(14), 'lower', false)).toBe(true);
    expect(isQuestionGuessCorrect(3, [card(14), card(5)], card(3), 'inside', false)).toBe(true);
    expect(isQuestionGuessCorrect(3, [card(14), card(5)], card(3), 'outside', true)).toBe(true);
    expect(determineDriver([
      { name: 'A', hand: [card(14)] },
      { name: 'B', hand: [card(2)] },
    ], false)).toBe(1);
  });

  it('applies the ace setting to the classic bus ride', () => {
    const lowAce = busState({ aceHigh: false, ride: [card(5)], deck: [card(14, 'hearts')] });
    expect((busfahrerReducer(lowAce, { type: 'guessBus', guess: 'lower' }) as BusState).ride).toHaveLength(2);
  });
});

function rauteState(overrides: Partial<RauteState> = {}): RauteState {
  return {
    phase: 'raute',
    players: [
      { name: 'Anna', hand: [] },
      { name: 'Ben', hand: [] },
      { name: 'Cem', hand: [] },
    ],
    deck: [card(9, 'hearts'), card(3, 'hearts'), card(6, 'hearts'), card(13, 'hearts')],
    seed: 1,
    aceHigh: true,
    // rows: 1-2-3-2-1
    rows: [
      [card(10)],
      [card(2), card(3)],
      [card(7), card(8), card(12)],
      [card(13), card(14)],
      [card(5, 'clubs')],
    ],
    playerIndex: 1,
    streak: 0,
    guesses: 0,
    sipsByPlayer: [0, 0, 0],
    lastResult: null,
    ...overrides,
  };
}

describe('Münchner Variante (Raute)', () => {
  it('is the default and deals 9 open cards as a 1-2-3-2-1 diamond with a drawn starting player', () => {
    const game = createGame(['Anna', 'Ben', 'Cem'], 2024) as RauteState;

    expect(game.phase).toBe('raute');
    expect(game.rows.map((row) => row.length)).toEqual([1, 2, 3, 2, 1]);
    expect(game.rows.map((row) => row.length)).toEqual([...RAUTE_ROW_SIZES]);
    expect(game.deck).toHaveLength(52 - 9);
    expect(game.playerIndex).toBeGreaterThanOrEqual(0);
    expect(game.playerIndex).toBeLessThan(3);
    expect(game.sipsByPlayer).toEqual([0, 0, 0]);
    expect(game.aceHigh).toBe(true);

    const startingPlayers = new Set(
      Array.from({ length: 30 }, (_, seed) => (createGame(['Anna', 'Ben', 'Cem'], seed) as RauteState).playerIndex),
    );
    expect(startingPlayers.size).toBe(3);
  });

  it('compares higher, equal and lower with the ace setting', () => {
    expect(isRauteGuessCorrect(card(7), card(9), 'higher', true)).toBe(true);
    expect(isRauteGuessCorrect(card(7), card(7, 'hearts'), 'equal', true)).toBe(true);
    expect(isRauteGuessCorrect(card(7), card(7, 'hearts'), 'higher', true)).toBe(false);
    expect(isRauteGuessCorrect(card(7), card(3), 'lower', true)).toBe(true);
    expect(isRauteGuessCorrect(card(7), card(14), 'higher', true)).toBe(true);
    expect(isRauteGuessCorrect(card(7), card(14), 'lower', false)).toBe(true);
  });

  it('forces a (re)start into the longest row and frees all rows after a correct guess', () => {
    const state = rauteState();
    expect(getSelectableRauteRows(state)).toEqual([2]);

    const blocked = busfahrerReducer(state, { type: 'guessRaute', row: 0, end: 'start', guess: 'higher' });
    expect(blocked).toBe(state);

    const next = busfahrerReducer(state, { type: 'guessRaute', row: 2, end: 'start', guess: 'higher' }) as RauteState;
    expect(next.lastResult).toEqual(expect.objectContaining({ correct: true, compared: card(7), card: card(9, 'hearts') }));
    expect(next.streak).toBe(1);
    expect(getSelectableRauteRows(next)).toEqual([0, 1, 2, 3, 4]);
  });

  it('allows ties between several longest rows', () => {
    const state = rauteState({
      rows: [[card(10)], [card(2), card(3), card(4)], [card(4)], [card(7), card(8), card(12)], [card(13)]],
    });

    expect(getSelectableRauteRows(state)).toEqual([1, 3]);
  });

  it('lays the drawn card next to the compared card at the chosen end', () => {
    const atStart = busfahrerReducer(rauteState(), { type: 'guessRaute', row: 2, end: 'start', guess: 'higher' }) as RauteState;
    expect(atStart.rows[2]).toEqual([card(9, 'hearts'), card(7), card(8), card(12)]);

    const atEnd = busfahrerReducer(rauteState(), { type: 'guessRaute', row: 2, end: 'end', guess: 'lower' }) as RauteState;
    expect(atEnd.rows[2]).toEqual([card(7), card(8), card(12), card(9, 'hearts')]);
    expect(atEnd.lastResult?.compared).toEqual(card(12));
  });

  it('on a miss charges the row size, keeps only the drawn card and shuffles the rest back into the deck', () => {
    const state = rauteState({ streak: 2 });
    // Row 2 (index 2) has 3 cards, last card is a Dame; the drawn 9 is lower, "higher" is wrong.
    const next = busfahrerReducer(state, { type: 'guessRaute', row: 2, end: 'end', guess: 'higher' }) as RauteState;

    expect(next.lastResult).toEqual(expect.objectContaining({ correct: false, sips: 3, card: card(9, 'hearts') }));
    expect(next.sipsByPlayer).toEqual([0, 3, 0]);
    expect(next.streak).toBe(0);
    expect(next.playerIndex).toBe(1);
    expect(next.rows[2]).toEqual([card(9, 'hearts')]);
    // 3 remaining deck cards + the 3 returned row cards, shuffled.
    expect(next.deck).toHaveLength(6);
    expect(next.deck).toEqual(expect.arrayContaining([card(7), card(8), card(12), card(3, 'hearts'), card(6, 'hearts'), card(13, 'hearts')]));
    expect(next.seed).not.toBe(state.seed);
    // The other rows stay untouched; the restart has to be in a longest row (now the 2 card rows).
    expect(next.rows.filter((_, index) => index !== 2)).toEqual(state.rows.filter((_, index) => index !== 2));
    expect(getSelectableRauteRows(next)).toEqual([1, 3]);
  });

  it('shuffles returned cards to random positions', () => {
    const decks = new Set(
      [1, 2, 3, 4, 5].map((seed) => JSON.stringify(
        (busfahrerReducer(rauteState({ seed, streak: 1 }), { type: 'guessRaute', row: 2, end: 'end', guess: 'higher' }) as RauteState).deck,
      )),
    );

    expect(decks.size).toBeGreaterThan(1);
  });

  it('lets the player pass only after 3 correct guesses in a row, then hands over to the next seat', () => {
    let state: RauteState = rauteState({ playerIndex: 2 });
    expect(busfahrerReducer(state, { type: 'passTurn' })).toBe(state);

    state = busfahrerReducer(state, { type: 'guessRaute', row: 2, end: 'start', guess: 'higher' }) as RauteState; // 9 > 7
    state = busfahrerReducer(state, { type: 'guessRaute', row: 0, end: 'start', guess: 'lower' }) as RauteState; // 3 < 10
    expect(canPassTurn(state)).toBe(false);
    state = busfahrerReducer(state, { type: 'guessRaute', row: 1, end: 'end', guess: 'higher' }) as RauteState; // 6 > 3
    expect(state.streak).toBe(3);
    expect(canPassTurn(state)).toBe(true);

    // Voluntarily continuing keeps the turn.
    state = busfahrerReducer(state, { type: 'guessRaute', row: 4, end: 'start', guess: 'higher' }) as RauteState; // K > 5
    expect(state.streak).toBe(4);

    const passed = busfahrerReducer(state, { type: 'passTurn' }) as RauteState;
    expect(passed.playerIndex).toBe(0);
    expect(passed.streak).toBe(0);
    expect(passed.lastResult).toBeNull();
    expect(passed.guesses).toBe(4);
  });

  it('keeps going with a fresh deck when the deck is empty', () => {
    const next = busfahrerReducer(rauteState({ deck: [] }), { type: 'guessRaute', row: 2, end: 'start', guess: 'higher' }) as RauteState;

    expect(next.deck).toHaveLength(51);
    expect(next.rows[2]).toHaveLength(4);
  });

  it('counts a correct "equal" guess as a hit that means Bierle exen', () => {
    const state = rauteState({ deck: [card(7, 'hearts')] });
    const next = busfahrerReducer(state, { type: 'guessRaute', row: 2, end: 'start', guess: 'equal' }) as RauteState;

    expect(next.lastResult).toEqual(expect.objectContaining({ correct: true, guess: 'equal' }));
    expect(isBierleExen(next.lastResult!)).toBe(true);
    expect(next.streak).toBe(1);
    expect(next.rows[2]).toEqual([card(7, 'hearts'), card(7), card(8), card(12)]);
    expect(next.sipsByPlayer).toEqual([0, 0, 0]);

    expect(isBierleExen({ correct: true, guess: 'higher' })).toBe(false);
    expect(isBierleExen({ correct: false, guess: 'equal' })).toBe(false);
  });

  it('ignores classic actions', () => {
    const state = rauteState();
    expect(busfahrerReducer(state, { type: 'answer', guess: 'red' })).toBe(state);
    expect(busfahrerReducer(state, { type: 'startBus' })).toBe(state);
  });
});

describe('parseBusfahrerState', () => {
  it('accepts real game states and rejects broken stored data', () => {
    expect(parseBusfahrerState(createGame(['Anna', 'Ben'], 1))).not.toBeNull();
    expect(parseBusfahrerState(createGame(['Anna', 'Ben'], 1, CLASSIC))).not.toBeNull();
    expect(parseBusfahrerState(pyramidState())).not.toBeNull();
    expect(parseBusfahrerState(busState())).not.toBeNull();
    expect(parseBusfahrerState(rauteState())).not.toBeNull();

    expect(parseBusfahrerState(null)).toBeNull();
    expect(parseBusfahrerState({ phase: 'questions' })).toBeNull();
    expect(parseBusfahrerState({ ...busState(), driverIndex: 5 })).toBeNull();
    expect(parseBusfahrerState({ ...questionsState(), round: 9 })).toBeNull();
    expect(parseBusfahrerState({ ...questionsState(), deck: [{ rank: 99, suit: 'hearts' }] })).toBeNull();
    expect(parseBusfahrerState({ ...questionsState(), phase: 'unknown' })).toBeNull();
    expect(parseBusfahrerState({ ...rauteState(), rows: [[card(2)]] })).toBeNull();
    // A game saved with the earlier 7 row diamond is not restored.
    expect(parseBusfahrerState({ ...rauteState(), rows: [[card(2)], [card(3)], [card(4)], [card(5)], [card(6)], [card(7)], [card(8)]] })).toBeNull();
    expect(parseBusfahrerState({ ...rauteState(), sipsByPlayer: [0] })).toBeNull();
  });

  it('migrates games saved before the ace option to "ace high"', () => {
    const { aceHigh: _aceHigh, ...legacyGame } = questionsState();

    expect(parseBusfahrerState(legacyGame)?.aceHigh).toBe(true);
    expect(parseBusfahrerState({ ...questionsState(), aceHigh: false })?.aceHigh).toBe(false);
  });
});
