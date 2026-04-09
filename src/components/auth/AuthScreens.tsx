import { useState, type FormEvent } from 'react';
import type { SupabaseProfile } from '../../lib/supabase';
import type { AuthDraft, AuthMode } from '../../app/types';
import { BrandHeading } from '../BrandHeading';

function AuthInput({
  field,
  inputName,
  type = 'text',
  placeholder,
  autoComplete,
  value,
  onChange,
  allowStoredValues = false,
}: {
  field: keyof AuthDraft;
  inputName: string;
  type?: 'text' | 'email';
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  allowStoredValues?: boolean;
}) {
  return (
    <input
      name={inputName}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      value={value}
      data-auth-field={field}
      data-lpignore={allowStoredValues ? undefined : 'true'}
      data-1p-ignore={allowStoredValues ? undefined : 'true'}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function PasswordField({
  field,
  inputName,
  placeholder,
  autoComplete,
  value,
  onChange,
}: {
  field: keyof AuthDraft;
  inputName: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        name={inputName}
        type={isVisible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        data-auth-field={field}
        data-lpignore="true"
        data-1p-ignore="true"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={isVisible ? `${placeholder} verbergen` : `${placeholder} anzeigen`}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="3.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          {isVisible ? null : (
            <path
              d="M4 20 20 4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          )}
        </svg>
      </button>
    </div>
  );
}

export function AuthScreen({
  mode,
  busy,
  authDraft,
  onDraftChange,
  onSubmit,
  onModeChange,
}: {
  mode: AuthMode;
  busy: boolean;
  authDraft: AuthDraft;
  onDraftChange: (field: keyof AuthDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onModeChange: (mode: AuthMode) => void;
}) {
  const authFormAutocomplete = 'on';
  const emailAutocomplete = mode === 'sign-up' ? 'email' : 'username';

  return (
    <div className="auth-shell">
      <div className="auth-stage">
        <section className="auth-card auth-card-wide">
          <div className="auth-copy auth-copy-editorial">
            <BrandHeading text="Frey Frey" className="brand-lockup-auth" />
            {mode === 'forgot-password' ? (
              <p>Fordere einen sicheren Link an, um dein Passwort zurückzusetzen.</p>
            ) : null}
            {mode === 'reset-password' ? (
              <p>Lege jetzt ein neues Passwort für dein Konto fest.</p>
            ) : null}
          </div>

          <form className="auth-panel auth-panel-editorial" autoComplete={authFormAutocomplete} onSubmit={(event) => void onSubmit(event)}>
            <div className="auth-autofill-decoys" aria-hidden="true">
              <input tabIndex={-1} autoComplete="username" defaultValue="" />
              <input tabIndex={-1} type="password" autoComplete="current-password" defaultValue="" />
            </div>

            {mode === 'sign-in' || mode === 'sign-up' ? (
              <div className="mode-switch auth-mode-switch">
                <button
                  type="button"
                  className={mode === 'sign-in' ? 'mode-button active' : 'mode-button'}
                  onClick={() => onModeChange('sign-in')}
                >
                  Anmelden
                </button>
                <button
                  type="button"
                  className={mode === 'sign-up' ? 'mode-button active' : 'mode-button'}
                  onClick={() => onModeChange('sign-up')}
                >
                  Registrieren
                </button>
              </div>
            ) : null}

            {mode === 'sign-up' ? (
              <AuthInput
                field="displayName"
                inputName="frey-profile-name"
                placeholder="Anzeigename"
                autoComplete="off"
                value={authDraft.displayName}
                onChange={(value) => onDraftChange('displayName', value)}
              />
            ) : null}
            {mode !== 'reset-password' ? (
              <AuthInput
                field="email"
                inputName="email"
                type="email"
                placeholder="E-Mail"
                autoComplete={emailAutocomplete}
                value={authDraft.email}
                onChange={(value) => onDraftChange('email', value)}
                allowStoredValues
              />
            ) : null}
            {mode !== 'forgot-password' ? (
              <PasswordField
                field="password"
                inputName="frey-secret-key"
                placeholder={mode === 'reset-password' ? 'Neues Passwort' : 'Passwort'}
                autoComplete="new-password"
                value={authDraft.password}
                onChange={(value) => onDraftChange('password', value)}
              />
            ) : null}
            {mode === 'reset-password' ? (
              <PasswordField
                field="confirmPassword"
                inputName="frey-secret-key-confirmation"
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
                value={authDraft.confirmPassword}
                onChange={(value) => onDraftChange('confirmPassword', value)}
              />
            ) : null}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy
                ? 'Bitte warten…'
                : mode === 'sign-in'
                  ? 'Jetzt anmelden'
                  : mode === 'sign-up'
                    ? 'Konto anlegen'
                    : mode === 'forgot-password'
                      ? 'Reset-Link senden'
                      : 'Passwort speichern'}
            </button>

            {mode === 'sign-in' ? (
              <button
                type="button"
                className="secondary-action"
                onClick={() => onModeChange('forgot-password')}
              >
                Passwort vergessen?
              </button>
            ) : null}
            {mode === 'forgot-password' || mode === 'reset-password' ? (
              <button
                type="button"
                className="secondary-action"
                onClick={() => onModeChange('sign-in')}
              >
                Zurück zur Anmeldung
              </button>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}

export function OnboardingScreen({
  profile,
  busy,
  onSubmit,
  onSignOut,
}: {
  profile: SupabaseProfile;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy auth-copy-editorial">
          <p className="eyebrow">Familie anlegen</p>
          <h1>Willkommen, {profile.display_name}</h1>
          <p>
            Dein Konto ist angelegt. Lege jetzt deine Familie an. Du startest dabei als
            Familienmitglied mit Gründerstatus.
          </p>
          <div className="account-summary">
            <span>{profile.email}</span>
            <span>Startrolle: {profile.role}</span>
          </div>
        </div>

        <form className="auth-panel auth-panel-editorial" onSubmit={(event) => void onSubmit(event)}>
          <input name="familyName" placeholder="Name deiner Familie" autoComplete="organization" />
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Familie wird angelegt…' : 'Familie erstellen'}
          </button>
          <button type="button" className="secondary-action" onClick={() => void onSignOut()}>
            Abmelden
          </button>
        </form>
      </section>
    </div>
  );
}

export function AuthLoadingScreen() {
  return (
    <div className="auth-shell auth-shell-loading">
      <section className="auth-loader-stage" role="status" aria-live="polite" aria-label="Lädt deine Familiendaten">
        <span className="auth-loader-voiceover">Lädt deine Familiendaten</span>
        <div className="auth-loader-orbit" aria-hidden="true">
          <span className="auth-loader-ring auth-loader-ring-outer" />
          <span className="auth-loader-ring auth-loader-ring-inner" />
          <span className="brand-mark brand-mark-loader">
            <img src="/freyLogo.svg" alt="" className="brand-mark-image" />
          </span>
        </div>
      </section>
    </div>
  );
}