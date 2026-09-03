import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import TagInput from './TagInput';
import FileDropZone, { DroppedFile } from './FileDropZone';
import { uploadDocuments } from '@/lib/api';
import { inferDocType } from '@/lib/docType';
import { newId, useSolicitations } from '@/store/solicitations';
import type { NoticeType, Solicitation, SolicitationDocument, TagKey } from '@/types';

interface Props {
  onClose: () => void;
}

const NOTICE_TYPES: NoticeType[] = [
  'Solicitation',
  'Sources Sought',
  'Pre-Solicitation',
  'Combined Synopsis/Solicitation',
  'Special Notice',
  'Award Notice',
];

const isoToday = (): string => new Date().toISOString().slice(0, 10);

/** "+ New Solicitation" — a centered popup rather than a standalone screen. */
const NewSolicitationModal: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const add = useSolicitations((s) => s.add);

  const [title, setTitle] = useState('');
  const [samUrl, setSamUrl] = useState('');
  const [number, setNumber] = useState('');
  const [agency, setAgency] = useState('');
  const [noticeType, setNoticeType] = useState<NoticeType>('Solicitation');
  const [responseDue, setResponseDue] = useState('');
  const [tbd, setTbd] = useState(false);
  const [tags, setTags] = useState<TagKey[]>([]);
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);

    const id = newId('sol');
    let docs: SolicitationDocument[] = [];

    if (files.length > 0) {
      setSubmitting(true);
      try {
        const uploaded = await uploadDocuments(files.map((f) => f.file));
        docs = uploaded.map((u, i) => ({
          id: u.docId,
          solicitationId: id,
          name: u.filename,
          type: inferDocType(u.filename),
          sub: `${new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })} · ${files[i]?.size ?? ''} · Khoo`,
          dateAdded: isoToday(),
          pinned: false,
          size: files[i]?.size,
        }));
      } catch (err) {
        setSubmitting(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Could not reach the FORGE server. Is it running?',
        );
        return;
      }
      setSubmitting(false);
    }

    const sol: Solicitation = {
      id,
      title: title.trim(),
      number: number.trim() || '—',
      agency: agency.trim() || 'Unknown',
      noticeType,
      responseDue: tbd ? 'TBD' : (responseDue || 'TBD'),
      tags,
      stage: 'Solicitation imported',
      progress: 4,
      samUrl: samUrl.trim() || undefined,
      createdAt: isoToday(),
    };

    add(sol, docs);
    navigate(`/solicitations/${id}`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="+ New Solicitation"
      subtitle="Register a new opportunity for tracking"
      maxWidth={620}
      lower
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="new-solicitation-form" className="btn" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Create Solicitation'}
          </button>
        </>
      }
    >
      <form id="new-solicitation-form" onSubmit={onSubmit}>
        <label className="label" htmlFor="title">
          Solicitation Title <span className="required-mark">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="USACE CMMC Compliance Services"
          autoFocus
          required
        />

        <label className="label" htmlFor="samUrl">
          SAM.gov Solicitation URL{' '}
          <span className="muted label-note">(auto-extracts metadata below)</span>
        </label>
        <input
          id="samUrl"
          type="url"
          value={samUrl}
          onChange={(e) => setSamUrl(e.target.value)}
          placeholder="https://sam.gov/opp/abc123/view"
        />

        <div className="row">
          <div>
            <label className="label" htmlFor="number">Solicitation #</label>
            <input
              id="number"
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="W912DY-26-R-0042"
            />
          </div>
          <div>
            <label className="label" htmlFor="agency">Agency</label>
            <input
              id="agency"
              type="text"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              placeholder="USACE"
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label className="label" htmlFor="noticeType">Notice Type</label>
            <select
              id="noticeType"
              value={noticeType}
              onChange={(e) => setNoticeType(e.target.value as NoticeType)}
            >
              {NOTICE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="responseDue">Response Due Date</label>
            <input
              id="responseDue"
              type="date"
              value={responseDue}
              disabled={tbd}
              onChange={(e) => setResponseDue(e.target.value)}
            />
            <label className="field-aside">
              <input
                type="checkbox"
                checked={tbd}
                onChange={(e) => setTbd(e.target.checked)}
              />
              Mark as TBD
            </label>
          </div>
        </div>

        <label className="label">
          Tags{' '}
          <span className="muted label-note">
            (custom — use any label that helps you sort and filter)
          </span>
        </label>
        <TagInput value={tags} onChange={setTags} />

        <label className="label">Solicitation Documents</label>
        <FileDropZone files={files} onChange={setFiles} variant="compact" />

        {error && <div className="form-error">{error}</div>}
      </form>
    </Modal>
  );
};

export default NewSolicitationModal;
