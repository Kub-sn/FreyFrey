import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthLoadingScreen, AuthScreen, OnboardingScreen } from './AuthScreens';

describe('AuthScreens', () => {
  it('renders sign-up mode and forwards mode changes', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(
      <AuthScreen
        mode="sign-up"
        busy={false}
        authDraft={{ displayName: 'Alex', email: 'alex@example.com', password: 'secret', confirmPassword: '' }}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onModeChange={onModeChange}
      />,
    );

    expect(screen.getByPlaceholderText('Anzeigename')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Konto anlegen' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(onModeChange).toHaveBeenCalledWith('sign-in');
  });

  it('submits onboarding and supports sign-out', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingScreen
        profile={{ id: 'user-1', email: 'alex@example.com', display_name: 'Alex', role: 'admin' }}
        busy={false}
        onSubmit={onSubmit}
        onSignOut={onSignOut}
      />,
    );

    await user.type(screen.getByPlaceholderText('Name deiner Familie'), 'Familie Test');
    await user.click(screen.getByRole('button', { name: 'Familie erstellen' }));
    await user.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(onSubmit).toHaveBeenCalled();
    expect(onSignOut).toHaveBeenCalled();
  });

  it('renders the auth loading state accessibly', () => {
    render(<AuthLoadingScreen />);

    expect(screen.getByRole('status', { name: 'Lädt deine Familiendaten' })).toBeInTheDocument();
  });
});