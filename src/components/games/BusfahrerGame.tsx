import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/classnames';
import {
  type BusfahrerAction,
  busfahrerReducer,
  type BusfahrerSettings,
  type BusfahrerState,
  createGame,
  DEFAULT_SETTINGS,
  MIN_PLAYERS,
  normalizePlayerNames,
  parseBusfahrerState,
  validatePlayerNames,
} from '../../lib/busfahrer';
import { clearUiDraft, loadUiDraft, saveUiDraft } from '../../lib/storage';
import { ConfirmationDialog } from '../planner/ConfirmationDialog';
import { AppButton } from '../ui/AppButton';
import { BusPhase, FinishedPhase, PyramidPhase, QuestionPhase } from './BusfahrerPhases';
import { RautePhase } from './BusfahrerRaute';
import { BusfahrerSetup } from './BusfahrerSetup';

export const BUSFAHRER_GAME_STORAGE_KEY = 'busfahrer-game';
export const BUSFAHRER_SETUP_STORAGE_KEY = 'busfahrer-setup';
/** Storage format before variants existed: a plain array of player names. Only read as fallback. */
export const LEGACY_PLAYERS_STORAGE_KEY = 'busfahrer-players';

// Taps within this window after a game step are ignored. Buttons change under the finger
// after every step (e.g. "Weiter" turns into answer buttons), so an accidental double tap
// would otherwise answer for the next player.
export const BUSFAHRER_TAP_LOCK_MS = 400;

const CLASSIC_PHASES = [
  { id: 'questions', label: 'Fragerunde' },
  { id: 'pyramid', label: 'Pyramide' },
  { id: 'bus', label: 'Busfahrt' },
] as const;

type BusfahrerSetupDraft = {
  names: string[];
  settings: BusfahrerSettings;
};

function createSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

export function loadSavedBusfahrerGame(): BusfahrerState | null {
  return parseBusfahrerState(loadUiDraft<unknown>(BUSFAHRER_GAME_STORAGE_KEY, null));
}

function isNameList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length >= MIN_PLAYERS && value.every((name) => typeof name === 'string');
}

function loadSavedSetup(): BusfahrerSetupDraft {
  const saved = loadUiDraft<Partial<BusfahrerSetupDraft> | null>(BUSFAHRER_SETUP_STORAGE_KEY, null);
  const legacyNames = loadUiDraft<unknown>(LEGACY_PLAYERS_STORAGE_KEY, null);
  const settings = saved?.settings;
  const fallbackNames = isNameList(legacyNames) ? legacyNames : Array.from({ length: MIN_PLAYERS }, () => '');

  return {
    names: isNameList(saved?.names) ? saved.names : fallbackNames,
    settings: {
      variant: settings?.variant === 'klassisch' || settings?.variant === 'muenchen'
        ? settings.variant
        : DEFAULT_SETTINGS.variant,
      aceHigh: typeof settings?.aceHigh === 'boolean' ? settings.aceHigh : DEFAULT_SETTINGS.aceHigh,
    },
  };
}

export function BusfahrerGame({
  createRandomSeed = createSeed,
  now = Date.now,
}: {
  createRandomSeed?: () => number;
  now?: () => number;
}) {
  const [game, setGame] = useState<BusfahrerState | null>(loadSavedBusfahrerGame);
  const [setup, setSetup] = useState<BusfahrerSetupDraft>(loadSavedSetup);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const lastStepAtRef = useRef<number | null>(null);

  const updateGame = (nextGame: BusfahrerState | null) => {
    setGame(nextGame);

    // Persist every step so the game survives an app restart (e.g. Android killing the app).
    if (nextGame) {
      saveUiDraft(BUSFAHRER_GAME_STORAGE_KEY, nextGame);
    } else {
      clearUiDraft(BUSFAHRER_GAME_STORAGE_KEY);
    }
  };

  const saveSetup = (nextSetup: BusfahrerSetupDraft) => {
    setSetup(nextSetup);
    saveUiDraft(BUSFAHRER_SETUP_STORAGE_KEY, nextSetup);
  };

  const dispatch = (action: BusfahrerAction) => {
    if (!game) {
      return;
    }

    const timestamp = now();

    if (lastStepAtRef.current !== null && timestamp - lastStepAtRef.current < BUSFAHRER_TAP_LOCK_MS) {
      return;
    }

    lastStepAtRef.current = timestamp;
    updateGame(busfahrerReducer(game, action));
  };

  const startGame = (nextSetup: BusfahrerSetupDraft) => {
    const validationError = validatePlayerNames(nextSetup.names);

    if (validationError) {
      setSetupError(validationError);
      return;
    }

    const normalizedSetup = { ...nextSetup, names: normalizePlayerNames(nextSetup.names) };
    // The first game buttons appear where the start button was, so lock taps here too.
    lastStepAtRef.current = now();
    setSetupError(null);
    saveSetup(normalizedSetup);
    updateGame(createGame(normalizedSetup.names, createRandomSeed(), normalizedSetup.settings));
  };

  const endGame = () => {
    setIsExitDialogOpen(false);
    updateGame(null);
  };

  if (!game) {
    return (
      <BusfahrerSetup
        errorMessage={setupError}
        names={setup.names}
        settings={setup.settings}
        onChangeNames={(names) => {
          setSetupError(null);
          saveSetup({ ...setup, names });
        }}
        onChangeSettings={(settings) => saveSetup({ ...setup, settings })}
        onStart={() => startGame(setup)}
      />
    );
  }

  const activePhaseIndex = game.phase === 'finished'
    ? CLASSIC_PHASES.length
    : CLASSIC_PHASES.findIndex((phase) => phase.id === game.phase);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        {game.phase === 'raute' ? (
          <span className="rounded-full bg-[rgba(24,52,47,0.06)] px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-[rgba(24,52,47,0.66)]">
            Münchner Variante · {game.aceHigh ? 'Ass hoch' : 'Ass niedrig'}
          </span>
        ) : (
          <ol className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-1.5 p-0" aria-label="Spielphasen">
            {CLASSIC_PHASES.map((phase, index) => (
              <li
                key={phase.id}
                aria-current={index === activePhaseIndex ? 'step' : undefined}
                className={cn(
                  'rounded-full px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.06em]',
                  index === activePhaseIndex && 'bg-[#18342f] text-[#f6efe2]',
                  index < activePhaseIndex && 'bg-[rgba(25,98,77,0.14)] text-[#19624d]',
                  index > activePhaseIndex && 'bg-[rgba(24,52,47,0.06)] text-[rgba(24,52,47,0.5)]',
                )}
              >
                {phase.label}
              </li>
            ))}
          </ol>
        )}

        {game.phase !== 'finished' ? (
          <AppButton
            type="button"
            variant="secondary"
            size="icon"
            className="inline-flex size-9 shrink-0 items-center justify-center border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.94)] text-[#18342f] [&_svg]:size-4"
            aria-label="Spiel beenden"
            onClick={() => setIsExitDialogOpen(true)}
          >
            <X aria-hidden="true" />
          </AppButton>
        ) : null}
      </div>

      {game.phase === 'raute' ? (
        <RautePhase
          state={game}
          onGuess={({ row, end }, guess) => dispatch({ type: 'guessRaute', row, end, guess })}
          onPass={() => dispatch({ type: 'passTurn' })}
        />
      ) : null}

      {game.phase === 'questions' ? (
        <QuestionPhase
          state={game}
          onAnswer={(guess) => dispatch({ type: 'answer', guess })}
          onNext={() => dispatch({ type: 'nextTurn' })}
        />
      ) : null}

      {game.phase === 'pyramid' ? (
        <PyramidPhase
          state={game}
          onReveal={() => dispatch({ type: 'revealPyramidCard' })}
          onStartBus={() => dispatch({ type: 'startBus' })}
        />
      ) : null}

      {game.phase === 'bus' ? (
        <BusPhase state={game} onGuess={(guess) => dispatch({ type: 'guessBus', guess })} />
      ) : null}

      {game.phase === 'finished' ? (
        <FinishedPhase
          state={game}
          // Only the classic variant has a finish screen: replay it with the same settings.
          onPlayAgain={() => startGame({
            names: game.players.map((player) => player.name),
            settings: { variant: 'klassisch', aceHigh: game.aceHigh },
          })}
          onNewPlayers={() => updateGame(null)}
        />
      ) : null}

      {isExitDialogOpen ? (
        <ConfirmationDialog
          heading="Spiel beenden?"
          id="busfahrer-exit-title"
          actions={(
            <>
              <AppButton type="button" variant="secondary" onClick={() => setIsExitDialogOpen(false)}>
                Weiterspielen
              </AppButton>
              <AppButton type="button" variant="danger" onClick={endGame}>
                Beenden
              </AppButton>
            </>
          )}
        >
          <p className="m-0">Der aktuelle Spielstand geht verloren.</p>
        </ConfirmationDialog>
      ) : null}
    </div>
  );
}
