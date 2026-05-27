import { useState, type FormEvent } from 'react';
import type { SupabaseProfile } from '../../lib/supabase';
import type { AuthDraft, AuthMode } from '../../app/types';
import { BrandHeading } from '../BrandHeading';
import { appInputClassName } from '../ui/AppField';
import { AppButton } from '../ui/AppButton';

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
      className={appInputClassName()}
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
    <div className="group relative">
      <input
        name={inputName}
        type={isVisible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        data-auth-field={field}
        data-lpignore="true"
        data-1p-ignore="true"
        className={appInputClassName('pr-[3.25rem]')}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <button
        type="button"
        className="absolute top-1/2 right-[0.55rem] -translate-y-1/2 inline-flex size-[2.2rem] items-center justify-center rounded-full border border-transparent bg-transparent text-[rgba(29,36,31,0.62)] transition-[background-color,color,border-color] duration-[140ms] ease-in-out hover:bg-[rgba(88,104,87,0.1)] hover:border-[rgba(88,104,87,0.16)] hover:text-forest-950 group-focus-within:text-forest-950 focus-visible:outline-2 focus-visible:outline-[rgba(88,104,87,0.35)] focus-visible:outline-offset-1 focus-visible:border-[rgba(88,104,87,0.2)] focus-visible:text-forest-950"
        aria-label={isVisible ? `${placeholder} verbergen` : `${placeholder} anzeigen`}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4">
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
      <div className="w-[min(1080px,100%)] grid gap-4 [&>.auth-card-wide]:w-full">
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
            <div className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
              <input tabIndex={-1} autoComplete="username" defaultValue="" className="w-px h-px m-0 p-0 border-0" />
              <input tabIndex={-1} type="password" autoComplete="current-password" defaultValue="" className="w-px h-px m-0 p-0 border-0" />
            </div>

            {mode === 'sign-in' || mode === 'sign-up' ? (
              <div className="mode-switch mt-0">
                <AppButton
                  type="button"
                  variant={mode === 'sign-in' ? 'primary' : 'secondary'}
                  className="flex-[1_1_calc(50%-0.25rem)] justify-center text-center rounded-full"
                  onClick={() => onModeChange('sign-in')}
                >
                  Anmelden
                </AppButton>
                <AppButton
                  type="button"
                  variant={mode === 'sign-up' ? 'primary' : 'secondary'}
                  className="flex-[1_1_calc(50%-0.25rem)] justify-center text-center rounded-full"
                  onClick={() => onModeChange('sign-up')}
                >
                  Registrieren
                </AppButton>
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

            <AppButton type="submit" variant="primary" disabled={busy}>
              {busy
                ? 'Bitte warten…'
                : mode === 'sign-in'
                  ? 'Jetzt anmelden'
                  : mode === 'sign-up'
                    ? 'Konto anlegen'
                    : mode === 'forgot-password'
                      ? 'Reset-Link senden'
                      : 'Passwort speichern'}
            </AppButton>

            {mode === 'sign-in' ? (
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => onModeChange('forgot-password')}
              >
                Passwort vergessen?
              </AppButton>
            ) : null}
            {mode === 'forgot-password' || mode === 'reset-password' ? (
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => onModeChange('sign-in')}
              >
                Zurück zur Anmeldung
              </AppButton>
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
          <p className="m-0 uppercase tracking-[0.18em] text-[0.72rem] opacity-75">Familie anlegen</p>
          <h1>Willkommen, {profile.display_name}</h1>
          <p>
            Dein Konto ist angelegt. Lege jetzt deine Familie an. Du startest dabei als
            Familienmitglied und Familiengründer.
          </p>
          <div className="account-summary">
            <span>{profile.email}</span>
            <span>Startrolle: {profile.role}</span>
          </div>
        </div>

        <form className="auth-panel auth-panel-editorial" onSubmit={(event) => void onSubmit(event)}>
          <input className={appInputClassName()} name="familyName" placeholder="Name deiner Familie" autoComplete="organization" />
          <AppButton type="submit" variant="primary" disabled={busy}>
            {busy ? 'Familie wird angelegt…' : 'Familie erstellen'}
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={() => void onSignOut()}>
            Abmelden
          </AppButton>
        </form>
      </section>
    </div>
  );
}

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <section
        className="grid place-items-center"
        role="status"
        aria-live="polite"
        aria-label="Lädt deine Familiendaten"
      >
        <span className="sr-only">Lädt deine Familiendaten</span>
        <div
          className="relative grid place-items-center isolate size-[10.5rem] max-[720px]:size-[9.3rem] max-[560px]:size-[8.25rem] before:content-[''] before:absolute before:inset-[1.55rem] before:rounded-full before:bg-[radial-gradient(circle,rgba(244,111,58,0.2),rgba(244,111,58,0))] before:blur-[14px] before:z-0"
          aria-hidden="true"
        >
          <span className="absolute rounded-full border-solid z-[1] inset-0 border-2 border-[rgba(24,52,47,0.08)] border-t-[rgba(244,111,58,0.96)] border-r-[rgba(24,52,47,0.3)] animate-loader-spin" />
          <span className="absolute rounded-full border-solid z-[1] inset-[0.82rem] border-[1.5px] border-[rgba(24,52,47,0.08)] border-b-[rgba(24,52,47,0.8)] border-l-[rgba(99,155,133,0.72)] animate-loader-spin-reverse max-[560px]:inset-[0.68rem]" />
          <span className="relative z-[2] inline-flex size-20 items-center justify-center shrink-0 p-[0.58rem] rounded-[1.25rem] bg-linear-to-b from-[rgba(255,248,240,0.98)] to-[rgba(246,239,226,0.95)] shadow-[0_18px_36px_rgba(35,27,17,0.12),inset_0_1px_0_rgba(255,255,255,0.84)] max-[720px]:size-[4.55rem] max-[720px]:p-2 max-[720px]:rounded-[1.12rem] max-[560px]:w-16 max-[560px]:p-[0.44rem] max-[560px]:rounded-[1rem]">
            <img src="/freyLogo.svg" alt="" className="w-full h-full block object-contain" />
          </span>
        </div>
      </section>
    </div>
  );
}