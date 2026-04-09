import { type FormEvent } from 'react';
import {
  CALENDAR_WEEKDAY_LABELS,
  formatCalendarDateLabel,
  formatCalendarEntrySchedule,
  formatCalendarMonthLabel,
  getCalendarDayButtonLabel,
  type buildCalendarMonth,
} from '../../lib/calendar-view';
import type { PlannerState } from '../../lib/planner-data';
import { getCalendarMetaParts } from './planner-shell-utils';

type CalendarMonth = ReturnType<typeof buildCalendarMonth>;

export function CalendarModule({
  activeTab,
  calendarMonth,
  calendarViewDate,
  selectedCalendarDate,
  selectedDayEntries,
  unscheduledCalendarEntries,
  visibleMonthEventCount,
  onAddCalendar,
  onChangeCalendarMonth,
  onSelectCalendarDate,
  onShowToday,
}: {
  activeTab: string;
  calendarMonth: CalendarMonth;
  calendarViewDate: Date;
  selectedCalendarDate: string;
  selectedDayEntries: PlannerState['calendar'];
  unscheduledCalendarEntries: PlannerState['calendar'];
  visibleMonthEventCount: number;
  onAddCalendar: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onChangeCalendarMonth: (amount: number) => void;
  onSelectCalendarDate: (dateKey: string) => void;
  onShowToday: () => void;
}) {
  return (
    <section className={activeTab === 'calendar' ? 'module is-visible' : 'module'}>
      <div className="module-layout calendar-module-layout">
        <form className="panel form-panel" onSubmit={(event) => void onAddCalendar(event)}>
          <h4>Termin anlegen</h4>
          <input name="title" placeholder="Titel" />
          <input name="date" type="date" aria-label="Datum" />
          <input name="time" type="time" aria-label="Uhrzeit" />
          <input name="place" placeholder="Ort" />
          <small className="calendar-form-hint">
            Monatsansicht und Tagesdetails aktualisieren sich sofort nach dem Speichern.
          </small>
          <button type="submit">Termin speichern</button>
        </form>
        <article className="panel list-panel calendar-panel">
          <div className="calendar-shell">
            <div className="calendar-toolbar">
              <div>
                <h4>{formatCalendarMonthLabel(calendarViewDate)}</h4>
                <small>{visibleMonthEventCount} Termine im sichtbaren Monat</small>
              </div>
              <div className="calendar-toolbar-actions">
                <button type="button" className="secondary-action" onClick={onShowToday}>
                  Heute
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  aria-label="Vorheriger Monat"
                  onClick={() => onChangeCalendarMonth(-1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  aria-label="Nächster Monat"
                  onClick={() => onChangeCalendarMonth(1)}
                >
                  →
                </button>
              </div>
            </div>

            <div className="calendar-weekday-row" aria-hidden="true">
              {CALENDAR_WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="calendar-grid" role="grid" aria-label="Monatskalender">
              {calendarMonth.flat().map((day) => (
                <button
                  key={day.dateKey}
                  type="button"
                  role="gridcell"
                  className={[
                    'calendar-day-cell',
                    day.isCurrentMonth ? '' : 'is-outside-month',
                    day.isToday ? 'is-today' : '',
                    day.isSelected ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={getCalendarDayButtonLabel(day.date, day.entries.length)}
                  onClick={() => onSelectCalendarDate(day.dateKey)}
                >
                  <span className="calendar-day-number">{day.dayNumber}</span>
                  <div className="calendar-day-events">
                    {day.entries.slice(0, 3).map((entry) => (
                      <span key={entry.id} className="calendar-event-pill">
                        {entry.time.trim() ? `${entry.time} ${entry.title}` : entry.title}
                      </span>
                    ))}
                    {day.entries.length > 3 ? (
                      <span className="calendar-more-events">+{day.entries.length - 3} weitere</span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            <div className="calendar-detail-grid">
              <section className="calendar-day-panel">
                <div className="panel-heading panel-heading-tight">
                  <div>
                    <h4>{formatCalendarDateLabel(selectedCalendarDate)}</h4>
                    <small>{selectedDayEntries.length} Termine ausgewählt</small>
                  </div>
                </div>
                {selectedDayEntries.length > 0 ? (
                  <ul className="agenda-list calendar-day-list">
                    {selectedDayEntries.map((entry) => (
                      <li key={entry.id}>
                        <div>
                          <strong>{entry.title}</strong>
                          <small>{getCalendarMetaParts(entry)}</small>
                        </div>
                        <span>{formatCalendarEntrySchedule(entry)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="overview-empty-state calendar-empty-state">
                    <strong>Kein Termin an diesem Tag</strong>
                    <small>Wähle einen anderen Tag oder lege links einen neuen Termin an.</small>
                  </div>
                )}
              </section>

              {unscheduledCalendarEntries.length > 0 ? (
                <section className="calendar-day-panel calendar-unscheduled-panel">
                  <div className="panel-heading panel-heading-tight">
                    <div>
                      <h4>Ohne klares Datum</h4>
                      <small>Ältere Einträge mit Freitext bleiben sichtbar, bis du sie neu anlegst.</small>
                    </div>
                  </div>
                  <ul className="agenda-list calendar-day-list">
                    {unscheduledCalendarEntries.map((entry) => (
                      <li key={entry.id}>
                        <div>
                          <strong>{entry.title}</strong>
                          <small>{[entry.date.trim(), getCalendarMetaParts(entry)].filter(Boolean).join(' · ')}</small>
                        </div>
                        <span>{entry.place}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}