import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import FileDropZone, { DroppedFile } from './FileDropZone';
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
 * MVP note: previously-tracked library documents (RFP/PWS/etc.) are fixture
 * metadata only — there's no stored file content behind them yet. Real
 * extraction can only run against files dropped in this modal, which is why
 * they're shown read-only below rather than as selectable checkboxes.
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
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = async () => {
    if (!name.trim() || files.length === 0 || !sol) return;

    setSubmitting(true);
    setError(null);
    try {
      const { id: runId } = await createExtractionRun({
        solicitation: { number: sol.number, title: sol.title, agency: sol.agency },
        name: name.trim(),
        docs: files.map((f) => ({ docId: f.id, filename: f.name })),
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
            disabled={!name.trim() || files.length === 0 || submitting}
          >
            {submitting ? 'Starting…' : 'Run Extraction'}
          </button>
        </>
      }
    >
      <label className="label" htmlFor="run-name">
        Run Title <span style={{ color: 'var(--note)' }}>*</span>
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
          <label className="label">
            Library Documents{' '}
            <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
              (metadata only — drop the actual files below to extract from them)
            </span>
          </label>
          {sourceDocs.map((d) => (
            <div key={d.id} className="checkbox-row" style={{ opacity: 0.6 }}>
              <span>📄 {d.name}</span>
              <span className="muted" style={{ fontSize: 11 }}>{d.size ?? d.type}</span>
            </div>
          ))}
        </>
      )}

      <label className="label">
        Files to Extract <span style={{ color: 'var(--note)' }}>*</span>
      </label>
      <FileDropZone
        files={files}
        onChange={setFiles}
        variant="compact"
        hint="PDF · or click to browse"
      />

      {error && (
        <p style={{ color: 'var(--crit)', fontSize: 12, marginTop: 10 }}>{error}</p>
      )}
    </Modal>
  );
};

export default NewExtractionRunModal;
