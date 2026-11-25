import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useQuickAddInput } from './useQuickAddInput';

function QuickAddHarness({ onSubmit }: { onSubmit: (text: string) => Promise<boolean> }) {
  const quickAdd = useQuickAddInput(onSubmit);

  return <input {...quickAdd.inputProps} aria-label="Quick add" />;
}

function createDeferred() {
  let resolve!: (value: boolean) => void;
  const promise = new Promise<boolean>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe('useQuickAddInput', () => {
  it('submits once on a double Enter and clears the field immediately', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    const onSubmit = vi.fn(() => deferred.promise);

    render(<QuickAddHarness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Quick add');

    await user.type(input, 'Brot{Enter}{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Brot');
    expect(input).toHaveValue('');

    await act(async () => {
      deferred.resolve(true);
    });
    expect(input).toHaveValue('');
  });

  it('ignores Enter on blank input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);

    render(<QuickAddHarness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Quick add'), '   {Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps text typed while a previous submit is still pending', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    const onSubmit = vi.fn(() => deferred.promise);

    render(<QuickAddHarness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Quick add');

    await user.type(input, 'Brot{Enter}');
    await user.type(input, 'Mil');

    await act(async () => {
      deferred.resolve(true);
    });

    expect(input).toHaveValue('Mil');
  });

  it('restores the submitted text when saving fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(false);

    render(<QuickAddHarness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Quick add');

    await user.type(input, 'Brot{Enter}');

    expect(input).toHaveValue('Brot');
  });

  it('does not overwrite new text when a pending submit fails', async () => {
    const user = userEvent.setup();
    const deferred = createDeferred();
    const onSubmit = vi.fn(() => deferred.promise);

    render(<QuickAddHarness onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Quick add');

    await user.type(input, 'Brot{Enter}');
    await user.type(input, 'Milch');

    await act(async () => {
      deferred.resolve(false);
    });

    expect(input).toHaveValue('Milch');
  });
});
