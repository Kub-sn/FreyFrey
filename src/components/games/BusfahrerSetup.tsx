import { Play, Plus, Trash2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { type BusfahrerSettings, type BusfahrerVariant, MAX_PLAYERS, MIN_PLAYERS } from '../../lib/busfahrer';
import { cn } from '../../lib/classnames';
import { AppButton } from '../ui/AppButton';
import { appInputClassName } from '../ui/AppField';

const VARIANTS: Array<{ id: BusfahrerVariant; label: string; description: string }> = [
  { id: 'muenchen', label: 'Münchner Variante', description: 'Offene Raute, höher/gleich/tiefer' },
  { id: 'klassisch', label: 'Klassisch', description: 'Fragerunde, Pyramide, Busfahrt' },
];

const ACE_OPTIONS: Array<{ aceHigh: boolean; label: string }> = [
  { aceHigh: true, label: 'Höchste Karte' },
  { aceHigh: false, label: 'Niedrigste Karte' },
];

function ChoiceGroup<T>({
  legend,
  options,
  isSelected,
  onSelect,
  getKey,
  renderOption,
  columnsClassName,
}: {
  legend: string;
  options: T[];
  isSelected: (option: T) => boolean;
  onSelect: (option: T) => void;
  getKey: (option: T) => string;
  renderOption: (option: T) => ReactNode;
  columnsClassName: string;
}) {
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[rgba(24,52,47,0.62)]">{legend}</legend>
      <div className={cn('grid gap-2', columnsClassName)}>
        {options.map((option) => (
          <label
            key={getKey(option)}
            className={cn(
              'grid cursor-pointer gap-0.5 rounded-[16px] border px-3 py-2.5 transition-colors',
              isSelected(option)
                ? 'border-[#19624d] bg-[rgba(25,98,77,0.1)] text-[#18342f]'
                : 'border-[rgba(24,52,47,0.12)] bg-[rgba(255,255,255,0.7)] text-[rgba(24,52,47,0.8)]',
            )}
          >
            <input
              type="radio"
              name={legend}
              className="sr-only"
              checked={isSelected(option)}
              onChange={() => onSelect(option)}
            />
            {renderOption(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BusfahrerSetup({
  errorMessage,
  names,
  settings,
  onChangeNames,
  onChangeSettings,
  onStart,
}: {
  errorMessage: string | null;
  names: string[];
  settings: BusfahrerSettings;
  onChangeNames: (names: string[]) => void;
  onChangeSettings: (settings: BusfahrerSettings) => void;
  onStart: () => void;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart();
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <ChoiceGroup
        legend="Variante"
        options={VARIANTS}
        columnsClassName="grid-cols-2"
        getKey={(option) => option.id}
        isSelected={(option) => option.id === settings.variant}
        onSelect={(option) => onChangeSettings({ ...settings, variant: option.id })}
        renderOption={(option) => (
          <>
            <strong className="text-[0.95rem]">{option.label}</strong>
            <span className="text-[0.78rem] leading-snug text-[rgba(24,52,47,0.62)]">{option.description}</span>
          </>
        )}
      />

      <ChoiceGroup
        legend="Ass ist die …"
        options={ACE_OPTIONS}
        columnsClassName="grid-cols-2"
        getKey={(option) => String(option.aceHigh)}
        isSelected={(option) => option.aceHigh === settings.aceHigh}
        onSelect={(option) => onChangeSettings({ ...settings, aceHigh: option.aceHigh })}
        renderOption={(option) => <strong className="text-[0.95rem]">{option.label}</strong>}
      />

      <div className="grid gap-1">
        <h4 className="m-0 text-[1.1rem] font-semibold text-[#18342f]">Wer spielt mit?</h4>
        <p className="m-0 text-[0.9rem] text-[rgba(24,52,47,0.66)]">
          {MIN_PLAYERS} bis {MAX_PLAYERS} Spieler. Das Handy wird reihum weitergegeben.
        </p>
      </div>

      <div className="grid gap-2">
        {names.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className={appInputClassName('flex-1')}
              aria-label={`Spieler ${index + 1}`}
              placeholder={`Spieler ${index + 1}`}
              value={name}
              maxLength={24}
              onChange={(event) => {
                const { value } = event.currentTarget;
                onChangeNames(names.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
              }}
            />
            {names.length > MIN_PLAYERS ? (
              <AppButton
                type="button"
                variant="danger"
                size="icon"
                className="size-10 min-w-10 [&_svg]:size-4"
                aria-label={`Spieler ${index + 1} entfernen`}
                onClick={() => onChangeNames(names.filter((_, entryIndex) => entryIndex !== index))}
              >
                <Trash2 aria-hidden="true" />
              </AppButton>
            ) : null}
          </div>
        ))}
      </div>

      {names.length < MAX_PLAYERS ? (
        <AppButton
          type="button"
          variant="secondary"
          className="inline-flex w-fit items-center gap-2 max-mobile:w-full max-mobile:justify-center"
          onClick={() => onChangeNames([...names, ''])}
        >
          <Plus aria-hidden="true" size={18} />
          Spieler hinzufügen
        </AppButton>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="m-0 rounded-[18px] bg-[rgba(165,71,34,0.12)] px-4 py-3 text-[#8f3415]">{errorMessage}</p>
      ) : null}

      <AppButton type="submit" variant="primary" className="inline-flex items-center justify-center gap-2 text-[1.05rem]">
        <Play aria-hidden="true" size={18} />
        Spiel starten
      </AppButton>

      <details className="rounded-[18px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,250,244,0.7)] px-4 py-3 text-[0.9rem] text-[rgba(24,52,47,0.78)]">
        <summary className="cursor-pointer font-semibold text-[#18342f]">
          Spielregeln: {settings.variant === 'muenchen' ? 'Münchner Variante' : 'Klassisch'}
        </summary>
        {settings.variant === 'muenchen' ? (
          <ul className="m-0 mt-2 grid gap-2 pl-5">
            <li>9 offene Karten liegen als Raute (1-2-3-2-1). Wer anfängt, wird ausgelost.</li>
            <li>
              Wähle die erste oder letzte Karte einer Reihe und tippe, ob die nächste Karte höher, gleich oder tiefer ist.
              Richtig: Die gezogene Karte wird daneben gelegt, die Reihe wird länger.
            </li>
            <li>
              Falsch: so viele Schlucke trinken, wie Karten in der Reihe liegen, und neu anfangen. Nur die gezogene Karte
              bleibt in der Reihe, die anderen werden zurück in den Stapel gemischt.
            </li>
            <li>Gleich richtig geraten: Bierle exen!</li>
            <li>Jeder Neustart beginnt in der längsten Reihe, danach ist jede Reihe frei.</li>
            <li>Nach 3 richtigen in Folge darfst du weitergeben oder freiwillig weiterraten. Ihr hört auf, wann ihr wollt.</li>
          </ul>
        ) : (
          <ol className="m-0 mt-2 grid gap-2 pl-5">
            <li>
              <strong>Fragerunde:</strong> Vier Runden, jeder beantwortet pro Runde eine Frage (Rot/Schwarz,
              Höher/Tiefer, Innerhalb/Außerhalb, Symbol) und behält die Karte. Richtig: Schlucke verteilen,
              falsch: selbst trinken. Runde 1 = 1 Schluck, Runde 4 = 4 Schlucke.
            </li>
            <li>
              <strong>Pyramide:</strong> Zehn Karten werden nacheinander aufgedeckt. Wer eine Karte mit
              gleichem Wert hat, legt sie ab und verteilt so viele Schlucke wie die Reihe zählt (unten 1, oben 4).
            </li>
            <li>
              <strong>Busfahrt:</strong> Wer am Ende die meisten Karten hat (bei Gleichstand die höheren), fährt Bus:
              vier Mal richtig Höher/Tiefer tippen. Gleich zählt als falsch. Bei einem Fehler wird getrunken und
              es geht von vorne los.
            </li>
          </ol>
        )}
      </details>
    </form>
  );
}
