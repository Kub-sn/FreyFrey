import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { documentPreviewFixture } from './planner-test-fixtures';
import { DocumentPreviewModal } from './DocumentPreviewModal';

describe('DocumentPreviewModal', () => {
  it('renders a pdf preview and close action', () => {
    render(
      <DocumentPreviewModal
        documentPreviewState={documentPreviewFixture}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTitle('PDF-Vorschau für Versicherung PDF')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'In neuem Tab öffnen' })).toHaveAttribute('href', documentPreviewFixture.url);
  });

  it('renders image previews when the kind is image', () => {
    render(
      <DocumentPreviewModal
        documentPreviewState={{ ...documentPreviewFixture, kind: 'image', url: 'https://example.com/image.png' }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByAltText('Vorschau für Versicherung PDF')).toBeInTheDocument();
  });
});