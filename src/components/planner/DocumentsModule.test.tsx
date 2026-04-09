import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { plannerFixture } from './planner-test-fixtures';
import { DocumentsModule } from './DocumentsModule';

describe('DocumentsModule', () => {
  it('renders documents and forwards document actions', async () => {
    const user = userEvent.setup();
    const onOpenDocumentPreview = vi.fn();
    const onStartDocumentEdit = vi.fn();
    const onDeleteDocument = vi.fn().mockResolvedValue(undefined);
    const onDocumentSearchTermChange = vi.fn();

    render(
      <DocumentsModule
        activeTab="documents"
        documentKindFilter="all"
        documentSearchTerm=""
        documentSelectionErrors={[]}
        documentSelectionSummary=""
        documentSort="recent"
        documentStatusFilter="all"
        documentStatusOptions={['Aktuell']}
        documentUploadProgress={null}
        isDocumentDropActive={false}
        selectedDocumentFiles={[]}
        totalDocumentCount={plannerFixture.documents.length}
        visibleDocuments={plannerFixture.documents}
        onClearSelectedDocumentFiles={vi.fn()}
        onDeleteDocument={onDeleteDocument}
        onDocumentDragLeave={vi.fn()}
        onDocumentDragOver={vi.fn()}
        onDocumentDrop={vi.fn()}
        onDocumentInputChange={vi.fn()}
        onDocumentKindFilterChange={vi.fn()}
        onDocumentSearchTermChange={onDocumentSearchTermChange}
        onDocumentSortChange={vi.fn()}
        onDocumentStatusFilterChange={vi.fn()}
        onOpenDocumentPreview={onOpenDocumentPreview}
        onRemoveSelectedDocumentFile={vi.fn()}
        onStartDocumentEdit={onStartDocumentEdit}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Datei hochladen')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Dokument')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Kategorie')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Status')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Link zum Dokument (optional)')).not.toBeInTheDocument();
    expect(screen.getByText('Versicherung PDF')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Dokumente suchen'), 'Versicherung');
    await user.click(screen.getByRole('button', { name: /Vorschau öffnen/i }));
    await user.click(screen.getByRole('button', { name: /bearbeiten/i }));
    await user.click(screen.getByRole('button', { name: /löschen/i }));

    expect(onDocumentSearchTermChange).toHaveBeenCalled();
    expect(onOpenDocumentPreview).toHaveBeenCalledWith(plannerFixture.documents[0]);
    expect(onStartDocumentEdit).toHaveBeenCalledWith(plannerFixture.documents[0]);
    expect(onDeleteDocument).toHaveBeenCalledWith(plannerFixture.documents[0]);
  });
});