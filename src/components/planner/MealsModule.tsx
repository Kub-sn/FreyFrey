import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { PlannerState } from '../../lib/planner-data';
import { cn } from '../../lib/classnames';
import {
  addDays,
  getMealCalendarDays,
  parseDateKey,
  startOfWeek,
  type MealCalendarDay,
  type MealCalendarView,
} from '../../lib/meals';
import { useActiveTab } from '../../context/ActiveTabContext';
import { validateRequiredFields, type FieldErrors } from '../../lib/form-validation';
import { clearUiDraft, loadUiDraft, saveUiDraft } from '../../lib/storage';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { appInputClassName, appTextareaClassName } from '../ui/AppField';
import { FieldError } from './FieldError';
import { ModalDialog } from './ModalDialog';

type MealDialogDraft = {
  selectedDate: string | null;
  name: string;
  recipe: string;
};

const MEAL_DIALOG_STORAGE_KEY = 'meals-dialog';
const EMPTY_MEAL_DIALOG_DRAFT = {
  name: '',
  recipe: '',
};

const weekdayHeaders = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const calendarViewMeta: Record<MealCalendarView, { title: string }> = {
  week: {
    title: 'Woche',
  },
  'two-weeks': {
    title: '2 Wochen',
  },
  month: {
    title: 'Monat',
  },
};

const fullDateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const titleDateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const dayNumberFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
});

const shortWeekdayFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
});

const monthFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
});

const rangeDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'short',
});

const mobileWeekNavButtonClassName = 'size-[3rem] min-w-[3rem] shrink-0';
const mobileWeekNavIconClassName = 'size-8 shrink-0';
const mealDeleteButtonClassName = 'size-[2.85rem] min-w-[2.85rem] shrink-0 self-start';
const mealDeleteIconClassName = 'size-5 shrink-0';

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDialogTitle(date: string) {
  return capitalize(titleDateFormatter.format(parseDateKey(date)));
}

function formatAriaDate(date: string) {
  return capitalize(fullDateFormatter.format(parseDateKey(date)));
}

function getMealCountLabel(count: number) {
  return count === 1 ? '1 Gericht' : `${count} Gerichte`;
}

function formatWeekRange(referenceDate: Date) {
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = addDays(weekStart, 6);

  return `${rangeDateFormatter.format(weekStart)} - ${rangeDateFormatter.format(weekEnd)}`;
}

function MealCalendarCell({
  day,
  meals,
  onOpen,
  compact = false,
}: {
  day: MealCalendarDay;
  meals: PlannerState['meals'];
  onOpen: (date: string) => void;
  compact?: boolean;
}) {
  const date = parseDateKey(day.date);
  const hiddenCount = meals.length > 3 ? meals.length - 3 : 0;

  if (compact) {
    return (
      <AppCard
        as="button"
        type="button"
        aria-label={`Essensplan für ${formatAriaDate(day.date)} öffnen`}
        aria-haspopup="dialog"
        onClick={() => onOpen(day.date)}
        className={cn(
          'w-full p-4 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(25,98,77,0.14)]',
          day.isCurrentPeriod
            ? 'border-[rgba(24,52,47,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,239,226,0.96))]'
            : 'border-[rgba(24,52,47,0.08)] bg-[rgba(255,255,255,0.55)] opacity-70',
          day.isToday
            ? 'shadow-[0_18px_38px_rgba(25,98,77,0.14)] ring-2 ring-[rgba(25,98,77,0.18)]'
            : undefined,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <p className="m-0 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[rgba(24,52,47,0.56)]">
              {capitalize(shortWeekdayFormatter.format(date))}
            </p>
            <p className="m-0 text-base font-semibold text-[#18342f]">
              {dayNumberFormatter.format(date)}. {capitalize(monthFormatter.format(date))}
            </p>
            <p className="m-0 text-sm text-[rgba(24,52,47,0.62)]">
              {meals.length > 0 ? meals.slice(0, 2).map((meal) => meal.name).join(', ') : 'Noch nichts geplant'}
            </p>
            {hiddenCount > 0 ? (
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(24,52,47,0.5)]">
                + {hiddenCount} weitere
              </span>
            ) : null}
          </div>
          <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full border border-[rgba(24,52,47,0.1)] bg-[rgba(255,255,255,0.78)] px-3 py-1 text-xs font-semibold text-[#18342f]">
            {meals.length}
          </span>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard
      as="button"
      type="button"
      aria-label={`Essensplan für ${formatAriaDate(day.date)} öffnen`}
      aria-haspopup="dialog"
      onClick={() => onOpen(day.date)}
      className={cn(
        'min-h-[13rem] p-4 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(25,98,77,0.14)]',
        day.isCurrentPeriod
          ? 'border-[rgba(24,52,47,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,239,226,0.96))]'
          : 'border-[rgba(24,52,47,0.08)] bg-[rgba(255,255,255,0.55)] opacity-70',
        day.isToday
          ? 'shadow-[0_18px_38px_rgba(25,98,77,0.14)] ring-2 ring-[rgba(25,98,77,0.18)]'
          : undefined,
      )}
    >
      <div className="grid h-full gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[rgba(24,52,47,0.56)]">
              {capitalize(shortWeekdayFormatter.format(date))}
            </p>
            <p className="m-0 mt-2 text-[1.7rem] font-semibold leading-none text-[#18342f]">
              {dayNumberFormatter.format(date)}
            </p>
            <p className="m-0 mt-1 text-sm text-[rgba(24,52,47,0.62)]">
              {capitalize(monthFormatter.format(date))}
            </p>
          </div>
          <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full border border-[rgba(24,52,47,0.1)] bg-[rgba(255,255,255,0.78)] px-3 py-1 text-xs font-semibold text-[#18342f]">
            {meals.length}
          </span>
        </div>

        {meals.length > 0 ? (
          <ul className="m-0 grid gap-2 p-0 text-sm text-[#18342f]">
            {meals.slice(0, 3).map((meal) => (
              <li key={meal.id} className="list-none rounded-[16px] border border-[rgba(24,52,47,0.08)] bg-[rgba(255,255,255,0.72)] px-3 py-2">
                <strong className="block text-sm font-semibold">{meal.name}</strong>
              </li>
            ))}
            {hiddenCount > 0 ? (
              <li className="list-none text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(24,52,47,0.5)]">
                + {hiddenCount} weitere
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="m-0 self-end text-sm italic text-[rgba(24,52,47,0.54)]">
            Noch nichts geplant
          </p>
        )}
      </div>
    </AppCard>
  );
}

export function MealsModule({
  meals,
  onCreateMeal,
  onDeleteMeal,
  referenceDate = new Date(),
  isMobileOverride,
}: {
  meals: PlannerState['meals'];
  onCreateMeal: (payload: Omit<PlannerState['meals'][number], 'id'>) => Promise<boolean>;
  onDeleteMeal: (mealId: string) => Promise<boolean>;
  referenceDate?: Date;
  isMobileOverride?: boolean;
}) {
  const { activeTab } = useActiveTab();
  const [initialMealDraft] = useState<MealDialogDraft>(() =>
    loadUiDraft<MealDialogDraft>(MEAL_DIALOG_STORAGE_KEY, {
      selectedDate: null,
      ...EMPTY_MEAL_DIALOG_DRAFT,
    }),
  );
  const [calendarView, setCalendarView] = useState<MealCalendarView>('two-weeks');
  const [selectedDate, setSelectedDate] = useState<string | null>(initialMealDraft.selectedDate);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    isMobileOverride
    ?? (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches),
  );
  const [mobileWeekOffset, setMobileWeekOffset] = useState(0);
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [mealDraft, setMealDraft] = useState(() => ({
    name: initialMealDraft.name,
    recipe: initialMealDraft.recipe,
  }));

  useEffect(() => {
    if (isMobileOverride !== undefined || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 720px)');
    const applyMatch = () => setIsMobileLayout(mediaQuery.matches);

    applyMatch();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applyMatch);

      return () => mediaQuery.removeEventListener('change', applyMatch);
    }

    mediaQuery.addListener(applyMatch);

    return () => mediaQuery.removeListener(applyMatch);
  }, [isMobileOverride]);

  useEffect(() => {
    if (isMobileOverride !== undefined) {
      setIsMobileLayout(isMobileOverride);
    }
  }, [isMobileOverride]);

  const effectiveView = isMobileLayout ? 'week' : calendarView;
  const effectiveReferenceDate = useMemo(
    () => (isMobileLayout ? addDays(referenceDate, mobileWeekOffset * 7) : referenceDate),
    [isMobileLayout, mobileWeekOffset, referenceDate],
  );
  const visibleDays = useMemo(
    () => getMealCalendarDays(effectiveView, effectiveReferenceDate),
    [effectiveReferenceDate, effectiveView],
  );

  const mealsByDate = useMemo(
    () => meals.reduce<Record<string, PlannerState['meals']>>((groups, meal) => {
      if (!groups[meal.date]) {
        groups[meal.date] = [];
      }

      groups[meal.date].push(meal);

      return groups;
    }, {}),
    [meals],
  );

  const selectedMeals = useMemo(
    () => (selectedDate ? mealsByDate[selectedDate] ?? [] : []),
    [mealsByDate, selectedDate],
  );

  const persistMealDialogDraft = (nextSelectedDate: string | null, nextMealDraft: typeof mealDraft) => {
    if (!nextSelectedDate) {
      clearUiDraft(MEAL_DIALOG_STORAGE_KEY);
      return;
    }

    saveUiDraft(MEAL_DIALOG_STORAGE_KEY, {
      selectedDate: nextSelectedDate,
      name: nextMealDraft.name,
      recipe: nextMealDraft.recipe,
    });
  };

  const updateMealDraft = (updater: (current: typeof mealDraft) => typeof mealDraft) => {
    setMealDraft((current) => {
      const next = updater(current);
      persistMealDialogDraft(selectedDate, next);
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedDate) {
      return;
    }

    const form = new FormData();
    form.set('name', mealDraft.name);
    const next = validateRequiredFields(form, [
      { name: 'name', label: 'Gerichtname' },
    ]);

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});

    const didSave = await onCreateMeal({
      date: selectedDate,
      name: mealDraft.name.trim(),
      recipe: mealDraft.recipe.trim(),
    });

    if (!didSave) {
      return;
    }

    setMealDraft(EMPTY_MEAL_DIALOG_DRAFT);
    clearUiDraft(MEAL_DIALOG_STORAGE_KEY);
  };

  const clearFieldError = (name: string) =>
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });

  const handleOpenDate = (date: string) => {
    const nextMealDraft = { ...EMPTY_MEAL_DIALOG_DRAFT };
    setSelectedDate(date);
    setErrors({});
    setMealDraft(nextMealDraft);
    persistMealDialogDraft(date, nextMealDraft);
  };

  const handleCloseDialog = () => {
    const nextMealDraft = { ...EMPTY_MEAL_DIALOG_DRAFT };
    setSelectedDate(null);
    setErrors({});
    setMealDraft(nextMealDraft);
    persistMealDialogDraft(null, nextMealDraft);
  };

  const handleShiftMobileWeek = (direction: -1 | 1) => {
    setMobileWeekOffset((current) => current + direction);
    handleCloseDialog();
  };

  const handleDeleteSelectedMeal = async (mealId: string) => {
    setDeletingMealId(mealId);
    try {
      await onDeleteMeal(mealId);
    } finally {
      setDeletingMealId((current) => (current === mealId ? null : current));
    }
  };

  return (
    <section className={activeTab === 'meals' ? 'module meals-module is-visible' : 'module meals-module'}>
      <div className="module-layout meals-module-layout">
        <div className="meals-module-content grid gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            {isMobileLayout ? (
              <div className="grid w-full gap-2 lg:w-auto">
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,255,255,0.72)] px-3 py-3">
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={mobileWeekNavButtonClassName}
                    aria-label="Vorherige Woche anzeigen"
                    onClick={() => handleShiftMobileWeek(-1)}
                  >
                    <ChevronLeft aria-hidden="true" className={mobileWeekNavIconClassName} />
                  </AppButton>
                  <strong className="text-sm text-center text-[#18342f]">{formatWeekRange(effectiveReferenceDate)}</strong>
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={mobileWeekNavButtonClassName}
                    aria-label="Nächste Woche anzeigen"
                    onClick={() => handleShiftMobileWeek(1)}
                  >
                    <ChevronRight aria-hidden="true" className={mobileWeekNavIconClassName} />
                  </AppButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2" aria-label="Kalenderansicht wählen">
                {(Object.entries(calendarViewMeta) as Array<[MealCalendarView, { title: string }]>)
                  .map(([view, meta]) => (
                    <AppButton
                      key={view}
                      type="button"
                      variant={calendarView === view ? 'primary' : 'secondary'}
                      aria-pressed={calendarView === view}
                      onClick={() => setCalendarView(view)}
                    >
                      {meta.title}
                    </AppButton>
                  ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[rgba(24,52,47,0.1)] bg-[linear-gradient(180deg,rgba(247,242,233,0.96),rgba(255,255,255,0.92))] p-3 sm:p-4">
            <div className={cn('pb-1', isMobileLayout ? undefined : 'overflow-x-auto')}>
              <div className={cn(
                isMobileLayout ? 'grid grid-cols-1 gap-3' : 'grid min-w-[54rem] grid-cols-7 gap-3',
              )}>
                {!isMobileLayout ? weekdayHeaders.map((weekday) => (
                  <div key={weekday} className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(24,52,47,0.46)]">
                    {weekday}
                  </div>
                )) : null}
                {visibleDays.map((day) => (
                  <MealCalendarCell
                    key={day.date}
                    day={day}
                    meals={mealsByDate[day.date] ?? []}
                    onOpen={handleOpenDate}
                    compact={isMobileLayout}
                  />
                ))}
              </div>
            </div>
          </div>

          {meals.length === 0 ? (
            <p className="m-0 rounded-[20px] border border-dashed border-[rgba(24,52,47,0.14)] bg-[rgba(255,255,255,0.64)] px-4 py-4 text-sm italic text-[rgba(24,52,47,0.58)]">
              Noch keine Gerichte vorhanden. Tippe im Kalender auf einen Tag, um den Essensplan zu füllen.
            </p>
          ) : null}
        </div>
      </div>

      {selectedDate ? (
        <ModalDialog
          id="meal-dialog-title"
          title={`Gerichte für ${formatDialogTitle(selectedDate)}`}
          onClose={handleCloseDialog}
          actions={(
            <>
              <AppButton type="button" variant="secondary" className="max-mobile:hidden" onClick={handleCloseDialog}>
                Schließen
              </AppButton>
              <AppButton type="submit" form="meal-entry-form">
                Gericht speichern
              </AppButton>
            </>
          )}
        >
          <div className="grid gap-4">
            <div className="rounded-[22px] border border-[rgba(24,52,47,0.1)] bg-[linear-gradient(180deg,rgba(247,242,233,0.92),rgba(255,255,255,0.94))] px-4 py-4">
              <p className="m-0 text-sm font-semibold text-[#18342f]">{formatDialogTitle(selectedDate)}</p>
              <p className="m-0 mt-1 text-sm text-[rgba(24,52,47,0.6)]">
                {getMealCountLabel(selectedMeals.length)} geplant
              </p>
            </div>

            <div className="grid gap-3">
              {selectedMeals.length > 0 ? selectedMeals.map((meal) => (
                <article key={meal.id} className="rounded-[20px] border border-[rgba(24,52,47,0.1)] bg-[rgba(255,255,255,0.82)] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="block text-base font-semibold text-[#18342f]">{meal.name}</strong>
                    <AppButton
                      type="button"
                      variant="danger"
                      size="icon"
                      className={mealDeleteButtonClassName}
                      aria-label={`Gericht ${meal.name} löschen`}
                      disabled={deletingMealId === meal.id}
                      onClick={() => void handleDeleteSelectedMeal(meal.id)}
                    >
                      <Trash2 aria-hidden="true" className={mealDeleteIconClassName} strokeWidth={2.2} />
                    </AppButton>
                  </div>
                  <p className="m-0 mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[rgba(24,52,47,0.7)]">
                    {meal.recipe || 'Kein Rezept hinterlegt.'}
                  </p>
                </article>
              )) : (
                <p className="m-0 rounded-[20px] border border-dashed border-[rgba(24,52,47,0.14)] bg-[rgba(255,255,255,0.68)] px-4 py-4 text-sm italic text-[rgba(24,52,47,0.58)]">
                  Noch keine Gerichte für diesen Tag geplant.
                </p>
              )}
            </div>

            <form id="meal-entry-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
              <div>
                <input
                  className={appInputClassName()}
                  name="name"
                  placeholder="Gerichtname"
                  value={mealDraft.name}
                  aria-invalid={errors.name ? 'true' : undefined}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  onInput={(event) => {
                    const nextName = event.currentTarget.value;
                    updateMealDraft((current) => ({ ...current, name: nextName }));
                    clearFieldError('name');
                  }}
                />
                <FieldError fieldName="name" message={errors.name} />
              </div>

              <textarea
                className={appTextareaClassName('min-h-[8rem]')}
                name="recipe"
                placeholder="Rezept"
                value={mealDraft.recipe}
                onChange={(event) => {
                  const nextRecipe = event.currentTarget.value;
                  updateMealDraft((current) => ({ ...current, recipe: nextRecipe }));
                }}
              />
            </form>
          </div>
        </ModalDialog>
      ) : null}
    </section>
  );
}