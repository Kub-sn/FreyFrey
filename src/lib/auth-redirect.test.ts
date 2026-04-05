import { describe, expect, it } from 'vitest';
import {
  RESET_PASSWORD_PATH,
  clearAuthRedirectState,
  getAuthRedirectError,
  getAuthRedirectMessage,
  getAuthRedirectMode,
} from './auth-redirect';

describe('auth redirect helpers', () => {
  it('detects a successful signup confirmation redirect', () => {
    expect(
      getAuthRedirectMessage(
        'http://localhost:5173/#access_token=test-token&type=signup&expires_in=3600',
      ),
    ).toBe('E-Mail bestätigt. Du bist jetzt erfolgreich angemeldet.');
  });

  it('clears auth callback parameters from the url', () => {
    expect(
      clearAuthRedirectState(
        'http://localhost:5173/?code=abc#access_token=test-token&type=signup',
      ),
    ).toBe('/');
  });

  it('detects a password recovery redirect', () => {
    expect(
      getAuthRedirectMode(
        'http://localhost:5173/#access_token=test-token&type=recovery&expires_in=3600',
      ),
    ).toBe('reset-password');
  });

  it('detects the dedicated reset-password route', () => {
    expect(getAuthRedirectMode(`http://localhost:5173${RESET_PASSWORD_PATH}`)).toBe('reset-password');
  });

  it('returns to the sign-in route after clearing auth state on the reset route', () => {
    expect(
      clearAuthRedirectState(
        `http://localhost:5173${RESET_PASSWORD_PATH}#access_token=test-token&type=recovery`,
      ),
    ).toBe('/');
  });

  it('humanizes expired auth redirect errors', () => {
    expect(
      getAuthRedirectError(
        'http://localhost:5173/#error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toBe('Der Bestätigungs- oder Wiederherstellungslink ist ungültig oder bereits abgelaufen. Bitte fordere einen neuen Link an.');
  });
});
