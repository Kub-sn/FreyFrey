import { ArrowDown, ArrowRight, ArrowUp, Equal, Layers } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/classnames';
import {
  canPassTurn,
  formatSips,
  getRauteEndCard,
  getSelectableRauteRows,
  isBierleExen,
  RAUTE_STREAK_TO_PASS,
  type RauteEnd,
  type RauteGuess,
  type RauteState,
} from '../../lib/busfahrer';
import { type Card, getCardLabel } from '../../lib/cards';
import { AppButton } from '../ui/AppButton';
import { createConfetti } from './confetti';
import { advanceGifQueue, FAIL_GIFS, shuffledIndices } from './failGifs';
import { GuessOverlay } from './GuessOverlay';
import { PlayingCard } from './PlayingCard';

type Selection = { row: number; end: RauteEnd };

// Small, non-blocking burst around the status line after a correct guess.
const SMALL_CONFETTI = createConfetti(10, 46);

const GUESS_BUTTONS: Array<{ guess: RauteGuess; label: string; Icon: typeof ArrowUp }> = [
  { guess: 'higher', label: 'Höher', Icon: ArrowUp },
  { guess: 'equal', label: 'Gleich', Icon: Equal },
  { guess: 'lower', label: 'Tiefer', Icon: ArrowDown },
];

// Only the outer cards of a row can be played. The middle cards are fanned out so each value
// stays readable; very long rows show the cards next to both ends and a counter in between,
// so a row never gets wider than a phone screen.
const MAX_FANNED_MIDDLE_CARDS = 7;
const CARDS_NEXT_TO_COUNTER = 3;

function FannedCards({ cards }: { cards: Card[] }) {
  return (
    <div className="flex">
      {cards.map((card, index) => (
        <PlayingCard key={index} card={card} size="sm" className={cn('opacity-90', index > 0 && '-ml-6')} />
      ))}
    </div>
  );
}

function EndCardButton({
  card,
  label,
  selectable,
  selected,
  onSelect,
}: {
  card: Card;
  label: string;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={!selectable}
      className={cn(
        'relative shrink-0 rounded-[10px] transition-transform duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(25,98,77,0.3)]',
        selectable && !selected && 'hover:-translate-y-0.5',
        selected && '-translate-y-1',
      )}
      onClick={onSelect}
    >
      <PlayingCard card={card} size="sm" highlighted={selected} className={cn(selectable && !selected && 'ring-2 ring-[rgba(25,98,77,0.35)]')} />
    </button>
  );
}

function RauteRow({
  cards,
  rowIndex,
  selectable,
  selection,
  onSelect,
}: {
  cards: Card[];
  rowIndex: number;
  selectable: boolean;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}) {
  const rowLabel = `Reihe ${rowIndex + 1}`;
  const middle = cards.slice(1, -1);
  const isSelected = (end: RauteEnd) => selection?.row === rowIndex && selection.end === end;

  return (
    <div className={cn('transition-opacity', !selectable && 'opacity-40')}>
      <div className="flex min-w-0 items-center justify-center" aria-label={`${rowLabel}, ${cards.length} ${cards.length === 1 ? 'Karte' : 'Karten'}`}>
        <EndCardButton
          card={cards[0]}
          label={cards.length === 1 ? `${rowLabel}: ${getCardLabel(cards[0])}` : `${rowLabel}, Anfang: ${getCardLabel(cards[0])}`}
          selectable={selectable}
          selected={isSelected('start')}
          onSelect={() => onSelect({ row: rowIndex, end: 'start' })}
        />

        {middle.length > 0 && middle.length <= MAX_FANNED_MIDDLE_CARDS ? (
          <div className="mx-1.5">
            <FannedCards cards={middle} />
          </div>
        ) : null}

        {middle.length > MAX_FANNED_MIDDLE_CARDS ? (
          <div className="mx-1.5 flex items-center gap-1">
            <FannedCards cards={middle.slice(0, CARDS_NEXT_TO_COUNTER)} />
            <span
              aria-hidden="true"
              className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#18342f] px-1.5 text-[0.7rem] font-bold text-[#f6efe2]"
            >
              +{middle.length - 2 * CARDS_NEXT_TO_COUNTER}
            </span>
            <FannedCards cards={middle.slice(-CARDS_NEXT_TO_COUNTER)} />
          </div>
        ) : null}

        {cards.length > 1 ? (
          <div className={middle.length === 0 ? 'ml-1.5' : undefined}>
            <EndCardButton
              card={cards[cards.length - 1]}
              label={`${rowLabel}, Ende: ${getCardLabel(cards[cards.length - 1])}`}
              selectable={selectable}
              selected={isSelected('end')}
              onSelect={() => onSelect({ row: rowIndex, end: 'end' })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RautePhase({
  state,
  onGuess,
  onPass,
}: {
  state: RauteState;
  onGuess: (selection: Selection, guess: RauteGuess) => void;
  onPass: () => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  // Feedback plays once per guess. Starting at the current count means a restored game
  // (e.g. after an app restart) does not replay the last animation.
  const [animatedGuesses, setAnimatedGuesses] = useState(state.guesses);
  // Reaction GIFs for misses: one at a time, shuffled, no repeat until all were shown.
  const [gifQueue, setGifQueue] = useState(() => shuffledIndices(FAIL_GIFS.length));
  const player = state.players[state.playerIndex];
  const nextPlayer = state.players[(state.playerIndex + 1) % state.players.length];
  const selectableRows = getSelectableRauteRows(state);
  // A selection can become invalid after a wrong guess (restart in the longest row).
  const activeSelection = selection && selectableRows.includes(selection.row) ? selection : null;
  const selectedCard = activeSelection ? getRauteEndCard(state.rows[activeSelection.row], activeSelection.end) : null;
  const { lastResult } = state;
  const canPass = canPassTurn(state);
  const exen = lastResult ? isBierleExen(lastResult) : false;
  const isFreshResult = lastResult !== null && state.guesses !== animatedGuesses;
  // A plain hit only gets a small animation so the game keeps flowing; misses and
  // "Bierle exen" get the full-screen moment.
  const showOverlay = isFreshResult && (!lastResult.correct || exen);
  const showSmallHit = isFreshResult && lastResult.correct && !exen;
  const currentGif = FAIL_GIFS.length > 0 ? FAIL_GIFS[gifQueue[0]] : null;

  const handleOverlayDone = () => {
    if (lastResult && !lastResult.correct && FAIL_GIFS.length > 0) {
      setGifQueue((queue) => advanceGifQueue(queue, FAIL_GIFS.length));
    }

    setAnimatedGuesses(state.guesses);
  };

  const handleGuess = (guess: RauteGuess) => {
    if (!activeSelection) {
      return;
    }

    onGuess(activeSelection, guess);
    setSelection(null);
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-1 text-center">
        <span className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[rgba(24,52,47,0.6)]">
          {state.streak >= RAUTE_STREAK_TO_PASS
            ? `${state.streak} richtig in Folge`
            : `${state.streak} von ${RAUTE_STREAK_TO_PASS} richtig`}
        </span>
        <strong className="text-[1.5rem] leading-tight text-[#18342f] [overflow-wrap:anywhere]">{player.name} ist dran</strong>
        {/* Always rendered with a fixed height so the diamond and the buttons never jump. */}
        <span className="relative mx-auto min-h-[1.5rem]">
          {showSmallHit ? (
            <span key={`confetti-${state.guesses}`} aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
              {SMALL_CONFETTI.map((particle, index) => (
                <span
                  key={index}
                  className="absolute block h-2 w-1.5 animate-confetti-small rounded-[2px] motion-reduce:hidden"
                  style={{ ...particle.style, backgroundColor: particle.color, animationDelay: particle.delay }}
                />
              ))}
            </span>
          ) : null}
          {/* The live region stays mounted so screen readers announce every change; only the text pops. */}
          <span
            role="status"
            className={cn(
              'block text-[1.05rem] font-semibold',
              lastResult?.correct === false && 'text-[#c8472d]',
              lastResult?.correct === true && !exen && 'text-[#19624d]',
              exen && 'text-[#b07d0f]',
              !lastResult && 'text-[rgba(24,52,47,0.66)]',
            )}
          >
            <span
              key={state.guesses}
              className={cn('inline-block', isFreshResult && 'animate-pop-in-fast motion-reduce:animate-none')}
            >
              {lastResult
                ? exen
                  ? 'Gleich! Bierle exen 🍺'
                  : lastResult.correct
                    ? 'Richtig!'
                    : `Falsch! ${formatSips(lastResult.sips)} trinken`
                : state.guesses === 0
                  ? 'Ausgelost – du fängst an'
                  : null}
            </span>
          </span>
        </span>
      </div>

      <div className="grid gap-1.5" aria-label="Raute">
        {state.rows.map((cards, rowIndex) => (
          <RauteRow
            key={rowIndex}
            cards={cards}
            rowIndex={rowIndex}
            selectable={selectableRows.includes(rowIndex)}
            selection={activeSelection}
            onSelect={setSelection}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {GUESS_BUTTONS.map(({ guess, label, Icon }) => (
          <AppButton
            key={guess}
            type="button"
            variant="secondary"
            disabled={!selectedCard}
            className="inline-flex min-h-[3.2rem] items-center justify-center gap-1.5 px-2"
            onClick={() => handleGuess(guess)}
          >
            <Icon aria-hidden="true" size={18} />
            {label}
          </AppButton>
        ))}
      </div>

      {canPass ? (
        <div className="grid gap-2 rounded-[18px] border border-[rgba(25,98,77,0.24)] bg-[rgba(25,98,77,0.06)] p-3">
          <span className="text-center text-[0.92rem] text-[#19624d]">
            {RAUTE_STREAK_TO_PASS} richtig! Du darfst weitergeben oder freiwillig weiterraten.
          </span>
          <AppButton type="button" variant="primary" className="inline-flex min-h-[3.2rem] items-center justify-center gap-2" onClick={onPass}>
            Weitergeben an {nextPlayer.name}
            <ArrowRight aria-hidden="true" size={18} />
          </AppButton>
        </div>
      ) : null}

      <div className="grid gap-2">
        <span className="inline-flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">
          <Layers aria-hidden="true" size={14} />
          Getrunken · Stapel: {state.deck.length} {state.deck.length === 1 ? 'Karte' : 'Karten'}
        </span>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0" aria-label="Getrunkene Schlucke">
          {state.players.map((entry, index) => (
            <li
              key={entry.name}
              className={cn(
                'flex items-center justify-between gap-2 rounded-[14px] border px-3 py-2 text-[0.9rem]',
                index === state.playerIndex
                  ? 'border-[rgba(25,98,77,0.32)] bg-[rgba(25,98,77,0.08)]'
                  : 'border-[rgba(24,52,47,0.08)] bg-[rgba(255,255,255,0.6)]',
              )}
            >
              <strong className="min-w-0 truncate text-[#18342f]">{entry.name}</strong>
              <span className="shrink-0 text-[rgba(24,52,47,0.66)]">{state.sipsByPlayer[index]}</span>
            </li>
          ))}
        </ul>
      </div>

      {showOverlay && lastResult ? (
        <GuessOverlay key={state.guesses} result={lastResult} gif={currentGif} onDone={handleOverlayDone} />
      ) : null}
    </div>
  );
}
