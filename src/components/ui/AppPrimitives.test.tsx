import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppButton, AppButtonLink } from './AppButton';
import { AppCard } from './AppCard';
import { AppDialogShell } from './AppDialogShell';
import {
  appCheckboxClassName,
  appInputClassName,
  appSelectClassName,
  appTextareaClassName,
  appToggleClassName,
} from './AppField';

describe('App primitives', () => {
  it('renders button variants with an explicit wrapper contract', () => {
    render(
      <>
        <AppButton type="button" variant="primary">Speichern</AppButton>
        <AppButtonLink href="/docs" variant="secondary">Docs</AppButtonLink>
      </>,
    );

    const primaryButton = screen.getByRole('button', { name: 'Speichern' });
    const secondaryLink = screen.getByRole('link', { name: 'Docs' });

    expect(primaryButton).toHaveClass('app-button', 'auth-submit');
    expect(primaryButton).toHaveAttribute('data-app-button-variant', 'primary');
    expect(secondaryLink).toHaveClass('app-button', 'secondary-action');
    expect(secondaryLink).toHaveAttribute('data-app-button-variant', 'secondary');
  });

  it('renders AppCard polymorphically and forwards props', () => {
    render(
      <AppCard as="form" aria-label="Neue Aufgabe" className="custom-card">
        <span>Inhalt</span>
      </AppCard>,
    );

    const form = screen.getByRole('form', { name: 'Neue Aufgabe' });
    expect(form.tagName).toBe('FORM');
    expect(form).toHaveClass('app-card', 'panel', 'custom-card');
  });

  it('renders AppDialogShell with the expected dialog accessibility attributes', () => {
    render(
      <AppDialogShell id="dialog-title">
        <h2 id="dialog-title">Dialogtitel</h2>
      </AppDialogShell>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Dialogtitel' });
    expect(dialog).toHaveClass('app-dialog-shell');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('exposes wrapper-specific field classes from the shared field helpers', () => {
    expect(appInputClassName()).toContain('app-input');
    expect(appTextareaClassName()).toContain('app-textarea');
    expect(appSelectClassName()).toContain('app-select');
    expect(appCheckboxClassName()).toContain('app-checkbox');
    expect(appCheckboxClassName()).toContain('checkbox');
    expect(appCheckboxClassName()).toContain('checkbox-xl');
    expect(appToggleClassName()).toContain('app-switch');
    expect(appToggleClassName()).toContain('toggle');
  });
});