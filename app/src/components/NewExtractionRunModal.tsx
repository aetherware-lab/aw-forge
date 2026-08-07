import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import FileDropZone, { DroppedFile } from './FileDropZone';
import { newId, useSolicitations } from '@/store/solicitations';
import type { SolicitationDocument } from '@/types';

interface Props {
  solicitationId: string;
  onClose: () => void;
}

/**
 * Overlay A — New Extraction Run.
 * Sits over the Solicitation Page; pre-checks RFP/PWS/Attachment source docs.
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
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(sourceDocs.map((d) => d.id)),
  );
  const [extraFiles, setExtraFiles] = useState<DroppedFile[]>([]);

  const toggleDoc = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onGenerate = () => {
    if (!name.trim()) return;

    const runId = newId('doc');
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
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={onGenerate}
            disabled={!name.trim() || (selected.size === 0 && extraFiles.length === 0)}
          >
            Run Extraction
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

      <label className="label">
        Source Documents{' '}
        <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
          (from solicitation library)
        </span>
      </label>

      {sourceDocs.length === 0 ? (
        <div className="empty" style={{ padding: 16, fontSize: 12 }}>
          No source documents on file. Drop the RFP / PWS below to get started.
        </div>
      ) : (
        sourceDocs.map((d) => (
          <label key={d.id} className="checkbox-row">
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() => toggleDoc(d.id)}
              />
              📄 {d.name}
            </span>
            <span className="muted" style={{ fontSize: 11 }}>
              {d.size ?? d.type}
            </span>
          </label>
        ))
      )}

      <label className="label">Additional Files (optional)</label>
      <FileDropZone
        files={extraFiles}
        onChange={setExtraFiles}
        variant="compact"
        hint="PDF, DOCX · or click to browse"
      />
    </Modal>
  );
};

export default NewExtractionRunModal;
