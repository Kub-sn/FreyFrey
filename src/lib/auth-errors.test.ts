import { describe, expect, it } from 'vitest';
import { humanizeAuthError } from './auth-errors';

describe('humanizeAuthError', () => {
  it('returns the message from regular Error instances', () => {
    expect(humanizeAuthError(new Error('Kaputt'))).toBe('Kaputt');
  });

  it('returns message, details and hint from Supabase-style error objects', () => {
    expect(
      humanizeAuthError({
        message: 'relation "profiles" does not exist',
        details: 'The table public.profiles is missing.',
        hint: 'Run the SQL schema.',
      }),
    ).toBe(
      'relation "profiles" does not exist The table public.profiles is missing. Hinweis: Run the SQL schema.',
    );
  });

  it('maps the postgrest single-row note update error to a clear message', () => {
    expect(
      humanizeAuthError({
        message: 'Cannot coerce the result to a single JSON object',
        details: 'The result contains 0 rows',
      }),
    ).toBe(
      'Die Notiz konnte nicht gespeichert werden. Prüfe bitte, ob die Datenbank-Migration für Notiz-Bearbeitung bereits ausgeführt wurde.',
    );
  });
});
