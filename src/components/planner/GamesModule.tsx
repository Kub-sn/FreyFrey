import { ArrowLeft, Bus } from 'lucide-react';
import { useState } from 'react';
import { useActiveTab } from '../../context/ActiveTabContext';
import { BusfahrerGame, loadSavedBusfahrerGame } from '../games/BusfahrerGame';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';

type GameId = 'busfahrer';

export function GamesModule() {
  const { activeTab } = useActiveTab();
  // Reopen a running game directly after an app restart.
  const [openGame, setOpenGame] = useState<GameId | null>(() => (loadSavedBusfahrerGame() ? 'busfahrer' : null));

  return (
    <section className={activeTab === 'games' ? 'module is-visible' : 'module'}>
      {openGame === 'busfahrer' ? (
        <div className="mx-auto grid w-full max-w-[640px] content-start gap-4 max-mobile:gap-3">
          <AppButton
            type="button"
            variant="secondary"
            className="inline-flex w-fit items-center gap-2"
            onClick={() => setOpenGame(null)}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Alle Spiele
          </AppButton>

          <AppCard className="grid gap-4 p-5 max-mobile:p-4">
            <h3 className="m-0 inline-flex items-center gap-2 text-[1.3rem] text-[#18342f]">
              <Bus aria-hidden="true" size={22} />
              Busfahrer
            </h3>
            <BusfahrerGame />
          </AppCard>
        </div>
      ) : (
        <div className="grid content-start gap-4 max-mobile:gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AppCard className="flex flex-col gap-3 border border-[rgba(24,52,47,0.1)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(247,241,231,0.96))] p-4 max-mobile:p-3.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-[14px] bg-[#19624d] text-[#f6efe2]">
                <Bus aria-hidden="true" size={22} />
              </span>
              <div className="grid gap-0.5">
                <h4 className="m-0 text-[1.08rem] font-semibold text-[#18342f]">Busfahrer</h4>
                <span className="text-[0.86rem] text-[rgba(24,52,47,0.62)]">Trinkspiel · 2–6 Spieler · ein Handy</span>
              </div>
            </div>
            <p className="m-0 text-[0.9rem] text-[rgba(24,52,47,0.72)]">
              Münchner Variante mit offener Raute oder klassisch mit Pyramide und Busfahrt. Schlucke gehen natürlich auch mit Wasser.
            </p>
            <AppButton type="button" variant="primary" onClick={() => setOpenGame('busfahrer')}>
              Busfahrer spielen
            </AppButton>
          </AppCard>
        </div>
      )}
    </section>
  );
}
