import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiveTabProvider } from '../../context/ActiveTabContext';
import { createGame } from '../../lib/busfahrer';
import { saveUiDraft } from '../../lib/storage';
import { BUSFAHRER_GAME_STORAGE_KEY } from '../games/BusfahrerGame';
import { GamesModule } from './GamesModule';

function renderGamesModule() {
  return render(
    <ActiveTabProvider activeTab="games" setActiveTab={vi.fn()}>
      <GamesModule />
    </ActiveTabProvider>,
  );
}

describe('GamesModule', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lists Busfahrer and opens it', async () => {
    const user = userEvent.setup();
    const { container } = renderGamesModule();

    expect(container.querySelector('section')).toHaveClass('is-visible');
    expect(screen.getByRole('heading', { name: 'Busfahrer' })).toBeInTheDocument();
    expect(screen.getByText('Trinkspiel · 2–6 Spieler · ein Handy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Busfahrer spielen' }));

    expect(screen.getByRole('button', { name: 'Spiel starten' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Alle Spiele' }));
    expect(screen.getByRole('button', { name: 'Busfahrer spielen' })).toBeInTheDocument();
  });

  it('reopens a running game directly', () => {
    saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, createGame(['Anna', 'Ben'], 1));

    renderGamesModule();

    // The Münchner variant draws the starting player.
    expect(screen.getByText(/^(Anna|Ben) ist dran$/)).toBeInTheDocument();
  });
});
