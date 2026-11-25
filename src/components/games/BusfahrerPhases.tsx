import { ArrowDown, ArrowUp, Bus, PartyPopper, RotateCcw, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/classnames';
import {
  BUS_RIDE_LENGTH,
  type BusGuess,
  type BusState,
  type FinishedState,
  formatSips,
  type GamePlayer,
  getAllowedGuesses,
  type PyramidState,
  PYRAMID_ROW_SIZES,
  type QuestionGuess,
  QUESTION_ROUNDS,
  type QuestionsState,
} from '../../lib/busfahrer';
import { getCardLabel, getCardValue, getRankLabel, SUIT_LABELS, SUIT_SYMBOLS } from '../../lib/cards';
import { AppButton } from '../ui/AppButton';
import { PlayingCard } from './PlayingCard';

const GUESS_LABELS: Record<QuestionGuess, string> = {
  red: 'Rot',
  black: 'Schwarz',
  higher: 'Höher',
  lower: 'Tiefer',
  inside: 'Innerhalb',
  outside: 'Außerhalb',
  hearts: `${SUIT_SYMBOLS.hearts} ${SUIT_LABELS.hearts}`,
  diamonds: `${SUIT_SYMBOLS.diamonds} ${SUIT_LABELS.diamonds}`,
  spades: `${SUIT_SYMBOLS.spades} ${SUIT_LABELS.spades}`,
  clubs: `${SUIT_SYMBOLS.clubs} ${SUIT_LABELS.clubs}`,
};

const answerButtonClassName = 'min-h-[3.4rem] text-[1.05rem]';

function Banner({ tone, children }: { tone: 'good' | 'bad' | 'neutral'; children: ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        'grid gap-1 rounded-[18px] px-4 py-3 text-[0.98rem]',
        tone === 'good' && 'bg-[rgba(25,98,77,0.12)] text-[#19624d]',
        tone === 'bad' && 'bg-[rgba(200,71,45,0.12)] text-[#8f3415]',
        tone === 'neutral' && 'bg-[rgba(24,52,47,0.08)] text-[#18342f]',
      )}
    >
      {children}
    </div>
  );
}

function TurnHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="grid gap-1 text-center">
      <span className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[rgba(24,52,47,0.6)]">{eyebrow}</span>
      <strong className="text-[1.5rem] leading-tight text-[#18342f] [overflow-wrap:anywhere]">{title}</strong>
    </div>
  );
}

function PlayerHands({ players, activeIndex }: { players: GamePlayer[]; activeIndex?: number }) {
  return (
    <div className="grid gap-2">
      <span className="inline-flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">
        <Users aria-hidden="true" size={14} />
        Karten auf der Hand
      </span>
      <ul className="m-0 grid list-none gap-2 p-0">
        {players.map((player, index) => (
          <li
            key={player.name}
            className={cn(
              'grid gap-2 rounded-[16px] border px-3 py-2',
              index === activeIndex
                ? 'border-[rgba(25,98,77,0.32)] bg-[rgba(25,98,77,0.08)]'
                : 'border-[rgba(24,52,47,0.08)] bg-[rgba(255,255,255,0.6)]',
            )}
          >
            <div className="flex items-center justify-between gap-2 text-[0.9rem]">
              <strong className="min-w-0 truncate text-[#18342f]">{player.name}</strong>
              <span className="shrink-0 text-[rgba(24,52,47,0.62)]">
                {player.hand.length === 1 ? '1 Karte' : `${player.hand.length} Karten`}
              </span>
            </div>
            {player.hand.length > 0 ? (
              <div className="flex flex-wrap gap-1.5" aria-label={`Karten von ${player.name}`}>
                {player.hand.map((card) => (
                  <PlayingCard key={`${card.suit}-${card.rank}`} card={card} size="sm" />
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getQuestionText(state: QuestionsState) {
  const hand = state.players[state.playerIndex].hand;

  switch (state.round) {
    case 1:
      return 'Rot oder Schwarz?';
    case 2:
      return `Höher oder tiefer als ${getRankLabel(hand[0].rank)}?`;
    case 3: {
      const [low, high] = [...hand.slice(0, 2)].sort(
        (first, second) => getCardValue(first, state.aceHigh) - getCardValue(second, state.aceHigh),
      );
      return `Zwischen ${getRankLabel(low.rank)} und ${getRankLabel(high.rank)} oder außerhalb?`;
    }
    case 4:
      return 'Welches Symbol?';
  }
}

export function QuestionPhase({
  state,
  onAnswer,
  onNext,
}: {
  state: QuestionsState;
  onAnswer: (guess: QuestionGuess) => void;
  onNext: () => void;
}) {
  const player = state.players[state.playerIndex];
  const { result } = state;
  const isLastPlayer = state.playerIndex === state.players.length - 1;
  const nextLabel = !isLastPlayer
    ? `Weiter: ${state.players[state.playerIndex + 1].name} ist dran`
    : state.round < QUESTION_ROUNDS
      ? `Weiter zu Runde ${state.round + 1}`
      : 'Weiter zur Pyramide';

  return (
    <div className="grid gap-5">
      <TurnHeading
        eyebrow={`Runde ${state.round} von ${QUESTION_ROUNDS} · ${formatSips(state.round)}`}
        title={`${player.name} ist dran`}
      />

      <div className="flex min-h-[6rem] flex-wrap items-end justify-center gap-2" aria-label={`Karten von ${player.name}`}>
        {player.hand.map((card) => (
          <PlayingCard
            key={`${card.suit}-${card.rank}`}
            card={card}
            highlighted={result !== null && card.rank === result.card.rank && card.suit === result.card.suit}
          />
        ))}
        {result === null ? <PlayingCard card={null} highlighted /> : null}
      </div>

      {result === null ? (
        <div className="grid gap-3">
          <p className="m-0 text-center text-[1.15rem] font-semibold text-[#18342f]">{getQuestionText(state)}</p>
          <div className="grid grid-cols-2 gap-3">
            {getAllowedGuesses(state.round).map((guess) => (
              <AppButton
                key={guess}
                type="button"
                variant="secondary"
                className={cn(
                  answerButtonClassName,
                  (guess === 'red' || guess === 'hearts' || guess === 'diamonds') && 'text-[#c8472d]',
                )}
                onClick={() => onAnswer(guess)}
              >
                {GUESS_LABELS[guess]}
              </AppButton>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <Banner tone={result.correct ? 'good' : 'bad'}>
            <strong className="text-[1.1rem]">{result.correct ? 'Richtig!' : 'Falsch!'}</strong>
            <span>
              Gezogen: {getCardLabel(result.card)}.{' '}
              {result.correct
                ? `${player.name} verteilt ${formatSips(result.sips)}.`
                : `${player.name} trinkt ${formatSips(result.sips)}.`}
            </span>
          </Banner>
          <AppButton type="button" variant="primary" className={answerButtonClassName} onClick={onNext}>
            {nextLabel}
          </AppButton>
        </div>
      )}
    </div>
  );
}

export function PyramidPhase({
  state,
  onReveal,
  onStartBus,
}: {
  state: PyramidState;
  onReveal: () => void;
  onStartBus: () => void;
}) {
  const nextIndex = state.pyramid.findIndex((entry) => !entry.revealed);
  const allRevealed = nextIndex === -1;
  const lastRevealed = state.lastReveal ? state.pyramid[state.lastReveal.index] : null;

  // Rows are stored bottom-up (row 1 first); render the top row first.
  const rows = PYRAMID_ROW_SIZES.map((size, rowIndex) => {
    const start = PYRAMID_ROW_SIZES.slice(0, rowIndex).reduce((total, entry) => total + entry, 0);
    return {
      row: rowIndex + 1,
      cards: state.pyramid.slice(start, start + size).map((entry, offset) => ({ ...entry, index: start + offset })),
    };
  }).reverse();

  return (
    <div className="grid gap-5">
      <TurnHeading eyebrow="Phase 2" title="Pyramide" />

      <div className="grid gap-2" aria-label="Pyramide">
        {rows.map(({ row, cards }) => (
          <div key={row} className="grid grid-cols-[3.6rem_1fr_3.6rem] items-center gap-2">
            <span className="text-right text-[0.75rem] font-semibold text-[rgba(24,52,47,0.6)]">{formatSips(row)}</span>
            <div className="flex justify-center gap-1.5">
              {cards.map((entry) => (
                <PlayingCard
                  key={entry.index}
                  card={entry.revealed ? entry.card : null}
                  highlighted={entry.index === nextIndex || entry.index === state.lastReveal?.index}
                  size="sm"
                  className="max-[360px]:h-12 max-[360px]:w-9"
                />
              ))}
            </div>
            <span aria-hidden="true" />
          </div>
        ))}
      </div>

      {state.lastReveal && lastRevealed ? (
        <Banner tone={state.lastReveal.matches.length > 0 ? 'good' : 'neutral'}>
          <strong>
            {getCardLabel(lastRevealed.card)} · Reihe {lastRevealed.row} ({formatSips(lastRevealed.row)} pro Karte)
          </strong>
          {state.lastReveal.matches.length > 0 ? (
            state.lastReveal.matches.map((match) => (
              <span key={match.playerIndex}>
                {state.players[match.playerIndex].name} legt{' '}
                {match.cards.length === 1 ? '1 Karte' : `${match.cards.length} Karten`} ab und verteilt {formatSips(match.sips)}.
              </span>
            ))
          ) : (
            <span>Niemand hat eine {getRankLabel(lastRevealed.card.rank)}.</span>
          )}
        </Banner>
      ) : (
        <Banner tone="neutral">
          <span>Wer eine Karte mit gleichem Wert hat, legt sie ab und verteilt Schlucke.</span>
        </Banner>
      )}

      {allRevealed ? (
        <AppButton type="button" variant="primary" className={cn(answerButtonClassName, 'inline-flex items-center justify-center gap-2')} onClick={onStartBus}>
          <Bus aria-hidden="true" size={20} />
          Busfahrer ermitteln
        </AppButton>
      ) : (
        <AppButton type="button" variant="primary" className={answerButtonClassName} onClick={onReveal}>
          Nächste Karte aufdecken
        </AppButton>
      )}

      <PlayerHands players={state.players} />
    </div>
  );
}

export function BusPhase({
  state,
  onGuess,
}: {
  state: BusState;
  onGuess: (guess: BusGuess) => void;
}) {
  const driver = state.players[state.driverIndex];
  const slots = Array.from({ length: BUS_RIDE_LENGTH }, (_, index) => state.ride[index] ?? null);
  const currentCard = state.ride[state.ride.length - 1];

  return (
    <div className="grid gap-5">
      <TurnHeading eyebrow={`Versuch ${state.attempts} · ${formatSips(state.sipsDrunk)} getrunken`} title={`${driver.name} fährt Bus`} />

      <div className="flex justify-center gap-1.5" aria-label="Busfahrt">
        {slots.map((card, index) => (
          <PlayingCard
            key={index}
            card={card}
            highlighted={index === state.ride.length - 1}
            className="max-mobile:h-20 max-mobile:w-[3.4rem]"
          />
        ))}
      </div>

      {state.lastMiss ? (
        <Banner tone="bad">
          <strong className="text-[1.1rem]">Falsch!</strong>
          <span>
            {getCardLabel(state.lastMiss.card)} – {driver.name} trinkt {formatSips(state.lastMiss.sips)} und fängt von vorne an.
          </span>
        </Banner>
      ) : (
        <Banner tone="neutral">
          <span>
            Noch {BUS_RIDE_LENGTH - state.ride.length} {BUS_RIDE_LENGTH - state.ride.length === 1 ? 'Karte' : 'Karten'} bis zum Ziel. Gleich zählt als falsch.
          </span>
        </Banner>
      )}

      <div className="grid gap-3">
        <p className="m-0 text-center text-[1.15rem] font-semibold text-[#18342f]">
          Höher oder tiefer als {getRankLabel(currentCard.rank)}?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <AppButton
            type="button"
            variant="secondary"
            className={cn(answerButtonClassName, 'inline-flex items-center justify-center gap-2')}
            onClick={() => onGuess('higher')}
          >
            <ArrowUp aria-hidden="true" size={20} />
            Höher
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            className={cn(answerButtonClassName, 'inline-flex items-center justify-center gap-2')}
            onClick={() => onGuess('lower')}
          >
            <ArrowDown aria-hidden="true" size={20} />
            Tiefer
          </AppButton>
        </div>
      </div>
    </div>
  );
}

export function FinishedPhase({
  state,
  onPlayAgain,
  onNewPlayers,
}: {
  state: FinishedState;
  onPlayAgain: () => void;
  onNewPlayers: () => void;
}) {
  const driver = state.driverIndex === null ? null : state.players[state.driverIndex];

  return (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-3 text-center">
        <PartyPopper aria-hidden="true" size={44} className="text-[#19624d]" />
        {driver ? (
          <>
            <strong className="text-[1.5rem] leading-tight text-[#18342f] [overflow-wrap:anywhere]">{driver.name} ist angekommen!</strong>
            <span className="text-[rgba(24,52,47,0.72)]">
              {state.attempts === 1 ? 'Im ersten Versuch' : `Nach ${state.attempts} Versuchen`} · {formatSips(state.sipsDrunk)} getrunken
            </span>
          </>
        ) : (
          <strong className="text-[1.5rem] leading-tight text-[#18342f]">Alle Karten sind weg – niemand muss Bus fahren!</strong>
        )}
      </div>

      {state.ride.length > 0 ? (
        <div className="flex justify-center gap-1.5" aria-label="Busfahrt">
          {state.ride.map((card, index) => (
            <PlayingCard key={index} card={card} size="sm" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <AppButton type="button" variant="primary" className={cn(answerButtonClassName, 'inline-flex items-center justify-center gap-2')} onClick={onPlayAgain}>
          <RotateCcw aria-hidden="true" size={18} />
          Nochmal spielen
        </AppButton>
        <AppButton type="button" variant="secondary" className={answerButtonClassName} onClick={onNewPlayers}>
          Neue Spieler
        </AppButton>
      </div>
    </div>
  );
}
