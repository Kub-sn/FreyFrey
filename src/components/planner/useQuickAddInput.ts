import { useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

/**
 * State for a "type and press Enter" quick add field.
 *
 * The field is cleared immediately on submit, so a fast double Enter cannot
 * submit the same text twice and text typed while the request is pending is
 * not wiped when it resolves. If saving fails, the submitted text is restored
 * (unless the user already typed something new).
 */
export function useQuickAddInput(onSubmit: (text: string) => Promise<boolean>) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const focus = () => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const submit = async () => {
    const submittedText = text;

    if (!submittedText.trim()) {
      return;
    }

    setText('');
    const didSave = await onSubmit(submittedText);

    if (!didSave) {
      setText((current) => current || submittedText);
      return;
    }

    focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    void submit();
  };

  return {
    inputProps: {
      ref: inputRef,
      value: text,
      onChange: (event: ChangeEvent<HTMLInputElement>) => setText(event.currentTarget.value),
      onKeyDown: handleKeyDown,
    },
    focus,
    reset: () => setText(''),
  };
}
