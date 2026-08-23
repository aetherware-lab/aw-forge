import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import FileDropZone, { DroppedFile } from './FileDropZone';
import { IconFileText } from '@/components/Icon';
import { createExtractionRun } from '@/lib/api';
import { useSolicitations } from '@/store/solicitations';
import type { SolicitationDocument } from '@/types';

interface Props {
  solicitationId: string;
  onClose: () => void;
}

/**
 * Overlay A — New Extraction Run.
 * Sits over the Solicitation Page.
 *
 * Library documents (RFP/PWS/etc.) are already stored server-side once
 * uploaded — see UploadDocumentModal and SolicitationForm — so they can be
 * selected directly instead of re-dropped here. Freshly dropped files are
 * uploaded as part of this request and included in the run alongside them.
 */
const NewExtractionRunModal: React.FC<Props> = ({ solicitationId, onClose }) => {
  const navigate = useNavigate();

  const solicitations = useSolicitations((s) => s.solicitations);
  const allDocuments = useSolicitations((s) => s.documents);
  const addDocument = useSolicitations((s) => s.addDocument);

  const sol = useMemo(
    () => solicitations.find((s) => s.id === solicitationId),
    [solicitations, solicitationId],
  );
  const docsForSol = useMemo(
    () => allDocuments.filter((d) => d.solicitationId === solicitationId),
    [allDocuments, solicitationId],
  );
  const sourceDocs = useMemo(
    () =>
      docsForSol.filter((d) =>
        ['RFP', 'PWS', 'Attachment', 'Amendment'].includes(d.type),
      ),
    [docsForSol],
  );

  const [name, setName] = useState(
    sol ? `${sol.title} — Extraction Run 1` : 'New Extraction Run',
  );
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(
    () => new Set(sourceDocs.map((d) => d.id)),
  );
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const totalSources = selectedDocIds.size + files.length;

  const onGenerate = async () => {
    if (!name.trim() || totalSources === 0 || !sol) return;

    setSubmitting(true);
    setError(null);
    try {
      const libraryDocs = sourceDocs
        .filter((d) => selectedDocIds.has(d.id))
        .map((d) => ({ docId: d.id, filename: d.name }));
      const freshDocs = files.map((f) => ({ docId: f.id, filename: f.name }));

      const { id: runId } = await createExtractionRun({
        solicitation: { number: sol.number, title: sol.title, agency: sol.agency },
        name: name.trim(),
        docs: [...libraryDocs, ...freshDocs],
        files: files.map((f) => f.file),
      });

      const today = new Date().toLocaleDateString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric',
      });
      const newDoc: SolicitationDocument = {
        id: runId,
        solicitationId,
        name: name.trim(),
        type: 'Extraction Run',
        sub: `${today} · extracting… · Khoo`,
        dateAdded: new Date().toISOString().slice(0, 10),
        pinned: false,
      };
      addDocument(newDoc);

      onClose();
      navigate(`/extraction/${runId}/citations`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reach the FORGE server. Is it running?',
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Extraction Run"
      subtitle={sol ? `for ${sol.title} · ${sol.number}` : undefined}
      maxWidth={520}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={onGenerate}
            disabled={!name.trim() || totalSources === 0 || submitting}
          >
            {submitting ? 'Starting…' : 'Run Extraction'}
          </button>
        </>
      }
    >
      <label className="label" htmlFor="run-name">
        Run Title <span className="required-mark">*</span>
      </label>
      <input
        id="run-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="USACE CMMC Compliance — Extraction Run 1"
        autoFocus
      />

      {sourceDocs.length > 0 && (
        <>
          <label className="label">Library Documents</label>
          {sourceDocs.map((d) => (
            <label key={d.id} className="checkbox-row">
              <span className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(d.id)}
                  onChange={() => toggleDoc(d.id)}
                />
                <IconFileText size={13} /> {d.name}
              </span>
              <span className="muted doc-size">{d.size ?? d.type}</span>
            </label>
          ))}
        </>
      )}

      <label className="label">
        {sourceDocs.length > 0 ? 'Additional Files' : 'Files to Extract'}{' '}
        {sourceDocs.length === 0 && <span className="required-mark">*</span>}
      </label>
      <FileDropZone
        files={files}
        onChange={setFiles}
        variant="compact"
        hint="PDF · or click to browse"
      />

      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
};

export default NewExtractionRunModal;
