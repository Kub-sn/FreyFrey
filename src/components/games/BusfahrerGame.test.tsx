import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BusState, RauteState } from '../../lib/busfahrer';
import type { Card } from '../../lib/cards';
import { loadUiDraft, saveUiDraft } from '../../lib/storage';
import {
  BUSFAHRER_GAME_STORAGE_KEY,
  BUSFAHRER_SETUP_STORAGE_KEY,
  BusfahrerGame,
  LEGACY_PLAYERS_STORAGE_KEY,
} from './BusfahrerGame';
import { FAIL_GIFS } from './failGifs';

// jsdom has no AnimationEvent, so React listens for the vendor-prefixed event there.
// Real browsers fire "animationend" (covered by the e2e test).
function fireAnimationEnd(element: Element) {
  fireEvent(element, new Event('webkitAnimationEnd', { bubbles: true }));
}

function createClock(start = 1_000) {
  let current = start;

  return {
    now: () => current,
    advance: (ms = 1_000) => {
      current += ms;
    },
  };
}

async function startGameWith(
  user: ReturnType<typeof userEvent.setup>,
  names: string[],
  variant: 'Münchner Variante' | 'Klassisch' = 'Klassisch',
) {
  await user.click(screen.getByRole('radio', { name: new RegExp(variant) }));

  for (let index = 2; index < names.length; index += 1) {
    await user.click(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
  }

  for (const [index, name] of names.entries()) {
    await user.type(screen.getByLabelText(`Spieler ${index + 1}`, { selector: 'input' }), name);
  }

  await user.click(screen.getByRole('button', { name: 'Spiel starten' }));
}

describe('BusfahrerGame', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('validates the player names before starting', async () => {
    const user = userEvent.setup();
    render(<BusfahrerGame />);

    await user.type(screen.getByLabelText('Spieler 1'), 'Anna');
    await user.click(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte gib allen Spielern einen Namen.');

    await user.type(screen.getByLabelText('Spieler 2'), 'anna');
    await user.click(screen.getByRole('button', { name: 'Spiel starten' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Jeder Name darf nur einmal vorkommen.');
  });

  it('allows between 2 and 6 players', async () => {
    const user = userEvent.setup();
    render(<BusfahrerGame />);

    expect(screen.queryByRole('button', { name: 'Spieler 1 entfernen' })).not.toBeInTheDocument();

    for (let count = 2; count < 6; count += 1) {
      await user.click(screen.getByRole('button', { name: 'Spieler hinzufügen' }));
    }

    expect(screen.getByLabelText('Spieler 6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spieler hinzufügen' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Spieler 6 entfernen' }));
    expect(screen.queryByLabelText('Spieler 6')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spieler hinzufügen' })).toBeInTheDocument();
  });

  it('plays a question turn and passes the phone to the next player', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    render(<BusfahrerGame createRandomSeed={() => 99} now={clock.now} />);

    await startGameWith(user, ['Anna', 'Ben', 'Cem']);

    expect(screen.getByText('Anna ist dran')).toBeInTheDocument();
    expect(screen.getByText('Rot oder Schwarz?')).toBeInTheDocument();
    expect(screen.getByText(/Runde 1 von 4/)).toBeInTheDocument();

    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Rot' }));

    expect(screen.getByRole('status')).toHaveTextContent(/(Richtig|Falsch)!/);
    expect(screen.getByRole('status')).toHaveTextContent(/Anna (verteilt|trinkt) 1 Schluck/);
    expect(within(screen.getByLabelText('Karten von Anna')).getAllByRole('img')).toHaveLength(1);

    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Weiter: Ben ist dran' }));
    expect(screen.getByText('Ben ist dran')).toBeInTheDocument();
  });

  it('ignores an accidental double tap right after a game step', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    render(<BusfahrerGame createRandomSeed={() => 99} now={clock.now} />);

    await startGameWith(user, ['Anna', 'Ben']);

    // Tap directly after starting is ignored.
    await user.click(screen.getByRole('button', { name: 'Rot' }));
    expect(screen.getByText('Rot oder Schwarz?')).toBeInTheDocument();

    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Rot' }));
    await user.click(screen.getByRole('button', { name: 'Weiter: Ben ist dran' }));

    // The second tap was swallowed, Anna's result is still shown.
    expect(screen.getByRole('status')).toHaveTextContent(/Anna/);

    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Weiter: Ben ist dran' }));
    expect(screen.getByText('Ben ist dran')).toBeInTheDocument();
  });

  it('persists the running game and the player names and restores them after a restart', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    const firstRender = render(<BusfahrerGame createRandomSeed={() => 5} now={clock.now} />);

    await startGameWith(user, ['Anna', 'Ben']);
    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Schwarz' }));

    expect(loadUiDraft(BUSFAHRER_SETUP_STORAGE_KEY, null)).toEqual({
      names: ['Anna', 'Ben'],
      settings: { variant: 'klassisch', aceHigh: true },
    });
    expect(loadUiDraft<{ phase: string } | null>(BUSFAHRER_GAME_STORAGE_KEY, null)?.phase).toBe('questions');

    firstRender.unmount();
    render(<BusfahrerGame />);

    expect(screen.getByText('Anna ist dran')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weiter: Ben ist dran' })).toBeInTheDocument();
  });

  it('falls back to the setup when the stored game is broken', () => {
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, { phase: 'bus', players: 'kaputt' });

    render(<BusfahrerGame />);

    expect(screen.getByRole('button', { name: 'Spiel starten' })).toBeInTheDocument();
  });

  it('asks before ending a running game and keeps the player names', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    render(<BusfahrerGame createRandomSeed={() => 5} now={clock.now} />);

    await startGameWith(user, ['Anna', 'Ben']);
    await user.click(screen.getByRole('button', { name: 'Spiel beenden' }));

    expect(screen.getByRole('heading', { name: 'Spiel beenden?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Weiterspielen' }));
    expect(screen.getByText('Anna ist dran')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Spiel beenden' }));
    await user.click(screen.getByRole('button', { name: 'Beenden' }));

    expect(screen.getByLabelText('Spieler 1')).toHaveValue('Anna');
    expect(screen.getByLabelText('Spieler 2')).toHaveValue('Ben');
    expect(loadUiDraft(BUSFAHRER_GAME_STORAGE_KEY, null)).toBeNull();
  });

  it('shows the bus ride and the finish screen', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    const busState: BusState = {
      phase: 'bus',
      players: [
        { name: 'Anna', hand: [{ rank: 3, suit: 'spades' }] },
        { name: 'Ben', hand: [] },
      ],
      deck: [{ rank: 14, suit: 'hearts' }],
      seed: 1,
      aceHigh: true,
      driverIndex: 0,
      ride: [
        { rank: 2, suit: 'spades' },
        { rank: 4, suit: 'spades' },
        { rank: 6, suit: 'spades' },
        { rank: 8, suit: 'spades' },
      ],
      attempts: 2,
      sipsDrunk: 1,
      lastMiss: null,
    };
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, busState);

    render(<BusfahrerGame createRandomSeed={() => 5} now={clock.now} />);

    expect(screen.getByText('Anna fährt Bus')).toBeInTheDocument();
    expect(screen.getByText(/Versuch 2 · 1 Schluck getrunken/)).toBeInTheDocument();
    expect(screen.getByText('Höher oder tiefer als 8?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Höher' }));

    expect(screen.getByText('Anna ist angekommen!')).toBeInTheDocument();
    expect(screen.getByText(/Nach 2 Versuchen · 1 Schluck getrunken/)).toBeInTheDocument();

    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Nochmal spielen' }));
    expect(screen.getByText('Anna ist dran')).toBeInTheDocument();
    expect(screen.getByText(/Runde 1 von 4/)).toBeInTheDocument();
  });
  it('preselects the Münchner variant with ace high and remembers changed settings', async () => {
    const user = userEvent.setup();
    const firstRender = render(<BusfahrerGame />);

    expect(screen.getByRole('radio', { name: /Münchner Variante/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Höchste Karte' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /Klassisch/ }));
    await user.click(screen.getByRole('radio', { name: 'Niedrigste Karte' }));
    expect(screen.getByText('Spielregeln: Klassisch')).toBeInTheDocument();

    firstRender.unmount();
    render(<BusfahrerGame />);

    expect(screen.getByRole('radio', { name: /Klassisch/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Niedrigste Karte' })).toBeChecked();
  });

  it('takes over player names saved before variants existed', () => {
    saveUiDraft(LEGACY_PLAYERS_STORAGE_KEY, ['Anna', 'Ben', 'Cem']);

    render(<BusfahrerGame />);

    expect(screen.getByLabelText('Spieler 3', { selector: 'input' })).toHaveValue('Cem');
    expect(screen.getByRole('radio', { name: /Münchner Variante/ })).toBeChecked();
  });

  it('starts the Münchner variant with an open diamond and a drawn starting player', async () => {
    const user = userEvent.setup();
    render(<BusfahrerGame createRandomSeed={() => 11} />);

    await startGameWith(user, ['Anna', 'Ben', 'Cem'], 'Münchner Variante');

    expect(screen.getByText(/Münchner Variante · Ass hoch/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ausgelost – du fängst an');
    expect(within(screen.getByLabelText('Raute')).getAllByRole('img')).toHaveLength(9);
    // Only the 3 card row is open for the first guess: its two outer cards are selectable.
    const enabledCards = within(screen.getByLabelText('Raute')).getAllByRole('button').filter((button) => !button.hasAttribute('disabled'));
    expect(enabledCards).toHaveLength(2);
    expect(enabledCards[0]).toHaveAccessibleName(/^Reihe 3, Anfang: /);
    expect(enabledCards[1]).toHaveAccessibleName(/^Reihe 3, Ende: /);
  });

  it('plays the Münchner variant: pick an outer card, guess, 3 hits allow passing, a miss collapses the row', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    const c = (rank: number, suit: Card['suit'] = 'spades'): Card => ({ rank, suit });
    const state: RauteState = {
      phase: 'raute',
      players: [{ name: 'Anna', hand: [] }, { name: 'Ben', hand: [] }],
      // drawn in this order
      deck: [c(9, 'hearts'), c(2, 'hearts'), c(6, 'hearts'), c(5, 'hearts')],
      seed: 1,
      aceHigh: true,
      rows: [[c(10)], [c(2), c(3)], [c(7), c(8), c(12)], [c(13), c(14)], [c(5, 'clubs')]],
      playerIndex: 0,
      streak: 0,
      guesses: 3,
      sipsByPlayer: [0, 0],
      lastResult: null,
    };
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, state);

    render(<BusfahrerGame now={clock.now} />);

    const guess = async (cardName: string, answer: 'Höher' | 'Gleich' | 'Tiefer') => {
      clock.advance();
      await user.click(screen.getByRole('button', { name: cardName }));
      expect(screen.getByRole('button', { name: cardName })).toHaveAttribute('aria-pressed', 'true');
      await user.click(screen.getByRole('button', { name: answer }));
    };

    // Start only in the longest row; the guess buttons unlock once a card is picked.
    expect(screen.getByRole('button', { name: 'Reihe 1: Pik 10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Höher' })).toBeDisabled();

    await guess('Reihe 3, Anfang: Pik 7', 'Höher'); // Herz 9 > 7
    expect(screen.getByRole('status')).toHaveTextContent(/^Richtig!$/);
    expect(screen.getByText('1 von 3 richtig')).toBeInTheDocument();
    // The drawn card now lies at the start of row 3.
    expect(screen.getByRole('button', { name: 'Reihe 3, Anfang: Herz 9' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Weitergeben/ })).not.toBeInTheDocument();

    await guess('Reihe 3, Ende: Pik Dame', 'Tiefer'); // Herz 2 < Dame
    await guess('Reihe 1: Pik 10', 'Tiefer'); // Herz 6 < 10

    expect(screen.getByText('3 richtig in Folge')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weitergeben an Ben' })).toBeInTheDocument();

    // Voluntarily keep going and miss: row 2 had 2 cards -> 2 sips, only the drawn card stays.
    await guess('Reihe 2, Anfang: Pik 2', 'Tiefer'); // Herz 5 > 2
    expect(screen.getByRole('status')).toHaveTextContent('Falsch! 2 Schlucke trinken');
    expect(screen.getByText('Anna ist dran')).toBeInTheDocument();
    expect(screen.getByText('0 von 3 richtig')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Getrunkene Schlucke')).getByText('Anna').closest('li')).toHaveTextContent('2');
    expect(within(screen.getByLabelText('Reihe 2, 1 Karte')).getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Reihe 2: Herz 5' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Weitergeben/ })).not.toBeInTheDocument();
    // Restart in the longest row (row 3 with 5 cards).
    expect(screen.getByRole('button', { name: 'Reihe 3, Anfang: Herz 9' })).toBeEnabled();
  });

  it('passes the phone to the next player after 3 correct guesses', async () => {
    const user = userEvent.setup();
    const c = (rank: number): Card => ({ rank, suit: 'spades' });
    const state: RauteState = {
      phase: 'raute',
      players: [{ name: 'Anna', hand: [] }, { name: 'Ben', hand: [] }],
      deck: [],
      seed: 1,
      aceHigh: true,
      rows: [[c(10)], [c(2), c(3)], [c(7), c(8), c(12)], [c(13), c(14)], [c(5)]],
      playerIndex: 1,
      streak: 3,
      guesses: 7,
      sipsByPlayer: [0, 0],
      lastResult: null,
    };
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, state);

    render(<BusfahrerGame />);
    await user.click(screen.getByRole('button', { name: 'Weitergeben an Anna' }));

    expect(screen.getByText('Anna ist dran')).toBeInTheDocument();
    expect(screen.getByText('0 von 3 richtig')).toBeInTheDocument();
  });

  it('fans out up to 7 middle cards and shortens longer rows to 3 + counter + 3', () => {
    const c = (rank: number): Card => ({ rank, suit: 'hearts' });
    const row = (length: number) => Array.from({ length }, (_, index) => c(2 + (index % 13)));
    const state: RauteState = {
      phase: 'raute',
      players: [{ name: 'Anna', hand: [] }, { name: 'Ben', hand: [] }],
      deck: [],
      seed: 1,
      aceHigh: true,
      rows: [row(1), row(9), row(14), row(2), row(1)],
      playerIndex: 0,
      streak: 1,
      guesses: 4,
      sipsByPlayer: [0, 0],
      lastResult: null,
    };
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, state);

    render(<BusfahrerGame />);

    // 9 cards: both ends + all 7 middle cards.
    expect(within(screen.getByLabelText('Reihe 2, 9 Karten')).getAllByRole('img')).toHaveLength(9);
    // 14 cards: both ends + 3 cards next to each end, the other 6 are counted.
    expect(within(screen.getByLabelText('Reihe 3, 14 Karten')).getAllByRole('img')).toHaveLength(8);
    expect(within(screen.getByLabelText('Reihe 3, 14 Karten')).getByText('+6')).toBeInTheDocument();
  });
  it('shows "Bierle exen" full screen, keeps hits small and shows a reaction GIF after a miss', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    const c = (rank: number, suit: Card['suit'] = 'spades'): Card => ({ rank, suit });
    const state: RauteState = {
      phase: 'raute',
      players: [{ name: 'Anna', hand: [] }, { name: 'Ben', hand: [] }],
      // equal -> hit -> miss
      deck: [c(7, 'hearts'), c(13, 'hearts'), c(2, 'hearts')],
      seed: 1,
      aceHigh: true,
      rows: [[c(10)], [c(2), c(3)], [c(7), c(8), c(12)], [c(13), c(14)], [c(5)]],
      playerIndex: 0,
      streak: 0,
      guesses: 0,
      sipsByPlayer: [0, 0],
      lastResult: null,
    };
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, state);

    const firstRender = render(<BusfahrerGame now={clock.now} />);
    const overlayQuery = () => screen.queryByRole('button', { name: 'Animation überspringen' });
    expect(overlayQuery()).not.toBeInTheDocument();

    // Bierle exen: full-screen moment, skippable with a tap.
    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Reihe 3, Anfang: Pik 7' }));
    await user.click(screen.getByRole('button', { name: 'Gleich' }));
    expect(screen.getByRole('status')).toHaveTextContent('Gleich! Bierle exen 🍺');
    expect(screen.getByText('1 von 3 richtig')).toBeInTheDocument();
    expect(overlayQuery()).toHaveTextContent('Bierle exen!');
    await user.click(overlayQuery()!);
    expect(overlayQuery()).not.toBeInTheDocument();

    // A plain hit only pops the status line: no overlay, the next card can be picked right away.
    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Reihe 2, Ende: Pik 3' }));
    await user.click(screen.getByRole('button', { name: 'Höher' }));
    expect(screen.getByRole('status')).toHaveTextContent(/^Richtig!$/);
    expect(overlayQuery()).not.toBeInTheDocument();

    // Miss: a reaction GIF plus the sips; it closes itself when its own fade-out ends.
    clock.advance();
    await user.click(screen.getByRole('button', { name: 'Reihe 1: Pik 10' }));
    await user.click(screen.getByRole('button', { name: 'Höher' }));
    const missOverlay = overlayQuery()!;
    expect(missOverlay).toHaveTextContent('Falsch!');
    expect(missOverlay).toHaveTextContent('1 Schluck trinken');
    const gif = missOverlay.querySelector('img');
    expect(FAIL_GIFS.map((entry) => entry.src)).toContain(gif?.getAttribute('src'));

    fireAnimationEnd(within(missOverlay).getByText('Falsch!'));
    expect(overlayQuery()).toBeInTheDocument();
    fireAnimationEnd(missOverlay);
    expect(overlayQuery()).not.toBeInTheDocument();

    // A restored game does not replay the last animation.
    firstRender.unmount();
    render(<BusfahrerGame />);
    expect(screen.getByRole('status')).toHaveTextContent('Falsch! 1 Schluck trinken');
    expect(overlayQuery()).not.toBeInTheDocument();
  });

  it('shows a different GIF on the next miss', async () => {
    const user = userEvent.setup();
    const clock = createClock();
    const c = (rank: number): Card => ({ rank, suit: 'spades' });
    const state: RauteState = {
      phase: 'raute',
      players: [{ name: 'Anna', hand: [] }, { name: 'Ben', hand: [] }],
      deck: [c(2), c(2), c(2)],
      seed: 1,
      aceHigh: true,
      rows: [[c(10)], [c(2), c(3)], [c(7), c(8), c(12)], [c(13), c(14)], [c(5)]],
      playerIndex: 0,
      streak: 0,
      guesses: 0,
      sipsByPlayer: [0, 0],
      lastResult: null,
    };
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, state);
    render(<BusfahrerGame now={clock.now} />);

    const missAndReadGif = async (cardName: string, guess: 'Höher' | 'Gleich') => {
      clock.advance();
      await user.click(screen.getByRole('button', { name: cardName }));
      await user.click(screen.getByRole('button', { name: guess }));
      const overlay = screen.getByRole('button', { name: 'Animation überspringen' });
      const src = overlay.querySelector('img')?.getAttribute('src');
      await user.click(overlay);
      return src;
    };

    const first = await missAndReadGif('Reihe 3, Anfang: Pik 7', 'Höher'); // Pik 2 < 7
    // Row 3 now only holds the drawn Pik 2 and its other cards were shuffled into the deck
    // (2, 2, 7, 8, Dame), so "equal" to the Ass in row 4 is a guaranteed miss.
    const second = await missAndReadGif('Reihe 4, Ende: Pik Ass', 'Gleich');

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('shows the sips in the animation after a miss', async () => {
    const user = userEvent.setup();
    const c = (rank: number): Card => ({ rank, suit: 'spades' });
    const state: RauteState = {
      phase: 'raute',
      players: [{ name: 'Anna', hand: [] }, { name: 'Ben', hand: [] }],
      deck: [c(2)],
      seed: 1,
      aceHigh: true,
      rows: [[c(10)], [c(2), c(3)], [c(7), c(8), c(12)], [c(13), c(14)], [c(5)]],
      playerIndex: 0,
      streak: 0,
      guesses: 0,
      sipsByPlayer: [0, 0],
      lastResult: null,
    };
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, state);

    render(<BusfahrerGame />);
    await user.click(screen.getByRole('button', { name: 'Reihe 3, Anfang: Pik 7' }));
    await user.click(screen.getByRole('button', { name: 'Höher' }));

    const overlay = screen.getByRole('button', { name: 'Animation überspringen' });
    expect(overlay).toHaveTextContent('Falsch!');
    expect(overlay).toHaveTextContent('3 Schlucke trinken');
    expect(overlay.querySelector('img')).toBeInTheDocument();
  });
});
