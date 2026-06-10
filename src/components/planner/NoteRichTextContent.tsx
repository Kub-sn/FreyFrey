import { cn } from '../../lib/classnames';
import { getNoteDisplayHtml } from './noteRichText';

export function NoteRichTextContent({
  className,
  value,
}: {
  className?: string;
  value: string;
}) {
  return (
    <div
      className={cn('note-rich-text-content whitespace-pre-wrap', className)}
      dangerouslySetInnerHTML={{ __html: getNoteDisplayHtml(value) }}
    />
  );
}
