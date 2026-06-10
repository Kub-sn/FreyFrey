import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NoteRichTextEditor } from './NoteRichTextEditor';

const originalExecCommand = document.execCommand;
const originalQueryCommandState = document.queryCommandState;

describe('NoteRichTextEditor', () => {
  afterEach(() => {
    document.execCommand = originalExecCommand;
    document.queryCommandState = originalQueryCommandState;
  });

  it('forwards toolbar formatting commands to the browser editing API', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.execCommand = vi.fn();

    render(
      <NoteRichTextEditor
        ariaLabel="Notizinhalt"
        onChange={onChange}
        placeholder="Inhalt"
        value=""
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Fett formatieren' }));
    await user.click(screen.getByRole('button', { name: 'Unterstreichen formatieren' }));
    await user.click(screen.getByRole('button', { name: 'Stichpunkte formatieren' }));
    await user.click(screen.getByRole('button', { name: 'Nummerierung formatieren' }));

    expect(document.execCommand).toHaveBeenCalledWith('bold');
    expect(document.execCommand).toHaveBeenCalledWith('underline');
    expect(document.execCommand).toHaveBeenCalledWith('insertUnorderedList');
    expect(document.execCommand).toHaveBeenCalledWith('insertOrderedList');
  });

  it('toggles checklist items from the editor surface', () => {
    const onChange = vi.fn();

    const { container } = render(
      <NoteRichTextEditor
        ariaLabel="Notizinhalt"
        onChange={onChange}
        placeholder="Inhalt"
        value={'<div data-note-rich-text="true"><ul data-list-type="checklist"><li data-checked="false">Turnbeutel</li></ul></div>'}
      />,
    );

    const listItem = container.querySelector('li[data-checked="false"]') as HTMLLIElement;
    vi.spyOn(listItem, 'getBoundingClientRect').mockReturnValue({
      bottom: 20,
      height: 20,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(listItem, { clientX: 8 });

    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('data-checked="true"'));
  });

  it('keeps inline formatting active for collapsed selections without forcing a change sync', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    let boldActive = false;
    let underlineActive = false;

    document.execCommand = vi.fn((command: string) => {
      if (command === 'bold') {
        boldActive = !boldActive;
      }

      if (command === 'underline') {
        underlineActive = !underlineActive;
      }

      return true;
    }) as typeof document.execCommand;
    document.queryCommandState = vi.fn((command: string) => {
      if (command === 'bold') {
        return boldActive;
      }

      if (command === 'underline') {
        return underlineActive;
      }

      return false;
    }) as typeof document.queryCommandState;

    const { container } = render(
      <NoteRichTextEditor
        ariaLabel="Notizinhalt"
        onChange={onChange}
        placeholder="Inhalt"
        value=""
      />,
    );

    const editor = container.querySelector('.note-rich-text-surface') as HTMLDivElement;
    const selection = window.getSelection();
    const range = document.createRange();

    fireEvent.focus(editor);
    range.setStart(editor, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const boldButton = screen.getByRole('button', { name: 'Fett formatieren' });
    const underlineButton = screen.getByRole('button', { name: 'Unterstreichen formatieren' });

    await user.click(boldButton);
    await user.click(underlineButton);

    expect(onChange).not.toHaveBeenCalled();
    expect(boldButton).toHaveClass('is-active');
    expect(underlineButton).toHaveClass('is-active');
  });

  it('keeps bold active even when no live selection object is available after the toggle', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.execCommand = vi.fn().mockReturnValue(true);

    render(
      <NoteRichTextEditor
        ariaLabel="Notizinhalt"
        onChange={onChange}
        placeholder="Inhalt"
        value=""
      />,
    );

    const getSelectionSpy = vi.spyOn(window, 'getSelection');
    getSelectionSpy.mockReturnValue(null);

    const boldButton = screen.getByRole('button', { name: 'Fett formatieren' });
    await user.click(boldButton);

    expect(onChange).not.toHaveBeenCalled();
    expect(boldButton).toHaveClass('is-active');

    getSelectionSpy.mockRestore();
  });

  it('creates an empty checklist item instead of placeholder text when the browser does not create a list node', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.execCommand = vi.fn();

    render(
      <NoteRichTextEditor
        ariaLabel="Notizinhalt"
        onChange={onChange}
        placeholder="Inhalt"
        value=""
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Checkbox-Liste formatieren' }));

    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, '<ul data-list-type="checklist"><li data-checked="false"><br></li></ul>');
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('Listenpunkt'));
  });

  it('toggles an existing checklist line off instead of inserting a new checkbox row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.execCommand = vi.fn().mockReturnValue(true);

    const { container } = render(
      <NoteRichTextEditor
        ariaLabel="Notizinhalt"
        onChange={onChange}
        placeholder="Inhalt"
        value={'<div data-note-rich-text="true"><ul data-list-type="checklist"><li data-checked="false">Turnbeutel</li></ul></div>'}
      />,
    );

    const checklistTextNode = container.querySelector('li[data-checked="false"]')?.firstChild;
    const selection = window.getSelection();
    const range = document.createRange();

    if (!checklistTextNode) {
      throw new Error('Checklist item text node not found');
    }

    range.setStart(checklistTextNode, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await user.click(screen.getByRole('button', { name: 'Checkbox-Liste formatieren' }));

    expect(document.execCommand).toHaveBeenCalledWith('insertUnorderedList');
    expect(document.execCommand).not.toHaveBeenCalledWith('insertHTML', false, expect.any(String));
  });

  it('keeps an unrelated checklist line unchanged when numbering is applied on another line', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.execCommand = vi.fn().mockReturnValue(true);

    const { container } = render(
      <NoteRichTextEditor
        ariaLabel="Notizinhalt"
        onChange={onChange}
        placeholder="Inhalt"
        value={'<div data-note-rich-text="true"><ul data-list-type="checklist"><li data-checked="false">Turnbeutel</li></ul><div>Zweiter Eintrag</div></div>'}
      />,
    );

    const secondLineTextNode = Array.from(container.querySelectorAll('div'))
      .find((element) => element.textContent === 'Zweiter Eintrag')
      ?.firstChild;
    const selection = window.getSelection();
    const range = document.createRange();

    if (!secondLineTextNode) {
      throw new Error('Second line text node not found');
    }

    range.setStart(secondLineTextNode, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await user.click(screen.getByRole('button', { name: 'Nummerierung formatieren' }));

    expect(document.execCommand).toHaveBeenCalledWith('insertOrderedList');
    expect(
      container.querySelector('ul[data-list-type="checklist"] li[data-checked="false"]')?.textContent,
    ).toBe('Turnbeutel');
  });
});