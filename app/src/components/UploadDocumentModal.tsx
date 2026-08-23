import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import FileDropZone, { DroppedFile } from './FileDropZone';
import { uploadDocuments } from '@/lib/api';
import { inferDocType } from '@/lib/docType';
import { useSolicitations } from '@/store/solicitations';
import type { SolicitationDocument } from '@/types';

interface Props {
  solicitationId: string;
  onClose: () => void;
}

/** Adds one or more source documents to an existing solicitation's library. */
const UploadDocumentModal: React.FC<Props> = ({ solicitationId, onClose }) => {
  const solicitations = useSolicitations((s) => s.solicitations);
  const addDocument = useSolicitations((s) => s.addDocument);

  const sol = useMemo(
    () => solicitations.find((s) => s.id === solicitationId),
    [solicitations, solicitationId],
  );

  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async () => {
    if (files.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const uploaded = await uploadDocuments(files.map((f) => f.file));
      const today = new Date().toLocaleDateString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric',
      });
      uploaded.forEach((u, i) => {
        const doc: SolicitationDocument = {
          id: u.docId,
          solicitationId,
          name: u.filename,
          type: inferDocType(u.filename),
          sub: `${today} · ${files[i]?.size ?? ''} · Khoo`,
          dateAdded: new Date().toISOString().slice(0, 10),
          pinned: false,
          size: files[i]?.size,
        };
        addDocument(doc);
      });
      onClose();
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
      title="Upload Document(s)"
      subtitle={sol ? `to ${sol.title} · ${sol.number}` : undefined}
      maxWidth={480}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={onUpload}
            disabled={files.length === 0 || submitting}
          >
            {submitting ? 'Uploading…' : 'Upload'}
          </button>
        </>
      }
    >
      <label className="label">
        Files <span className="required-mark">*</span>
      </label>
      <FileDropZone
        files={files}
        onChange={setFiles}
        variant="compact"
        hint="PDF, DOCX · RFP, PWS, attachments, amendments"
      />

      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
};

export default UploadDocumentModal;
