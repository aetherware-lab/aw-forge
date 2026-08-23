import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TagInput from '@/components/TagInput';
import FileDropZone, { DroppedFile } from '@/components/FileDropZone';
import { uploadDocuments } from '@/lib/api';
import { inferDocType } from '@/lib/docType';
import {
  newId,
  useSolicitations,
} from '@/store/solicitations';
import type {
  NoticeType,
  Solicitation,
  SolicitationDocument,
  TagKey,
} from '@/types';

interface Props {
  /** When set, the form edits this solicitation in place. Otherwise it creates a new one. */
  existing?: Solicitation;
  /** Initial set of files attached. Only meaningful for "new". */
  initialFiles?: DroppedFile[];
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

const SolicitationForm: React.FC<Props> = ({ existing, initialFiles = [] }) => {
  const navigate = useNavigate();
  // Subscribe to individual actions — Zustand returns stable references for
  // these so it doesn't trigger re-renders the way reading the whole store
  // object would.
  const add = useSolicitations((s) => s.add);
  const update = useSolicitations((s) => s.update);

  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [samUrl, setSamUrl] = useState(existing?.samUrl ?? '');
  const [number, setNumber] = useState(existing?.number ?? '');
  const [agency, setAgency] = useState(existing?.agency ?? '');
  const [noticeType, setNoticeType] = useState<NoticeType>(
    existing?.noticeType ?? 'Solicitation',
  );
  const [responseDue, setResponseDue] = useState(
    existing && existing.responseDue !== 'TBD' ? existing.responseDue : '',
  );
  const [tbd, setTbd] = useState(existing?.responseDue === 'TBD');
  const [tags, setTags] = useState<TagKey[]>(existing?.tags ?? []);
  const [files, setFiles] = useState<DroppedFile[]>(initialFiles);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);

    if (isEdit && existing) {
      update(existing.id, {
        title: title.trim(),
        number: number.trim(),
        agency: agency.trim(),
        noticeType,
        responseDue: tbd ? 'TBD' : (responseDue || 'TBD'),
        tags,
        samUrl: samUrl.trim() || undefined,
      });
      navigate(`/solicitations/${existing.id}`);
      return;
    }

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
    <>
      <header className="page-header">
        <div>
          <div className="page-title">
            {isEdit ? 'Edit Solicitation' : '+ New Solicitation'}
          </div>
          <div className="page-sub">
            {isEdit ? existing?.number : 'Register a new opportunity for tracking'}
          </div>
        </div>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => navigate(isEdit && existing ? `/solicitations/${existing.id}` : '/solicitations')}
        >
          Cancel
        </button>
      </header>

      <form onSubmit={onSubmit} className="form-narrow">
        <label className="label" htmlFor="title">
          Solicitation Title <span className="required-mark">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="USACE CMMC Compliance Services"
          required
        />

        <label className="label" htmlFor="samUrl">
          SAM.gov Solicitation URL{' '}
          <span className="muted label-note">
            (auto-extracts metadata below)
          </span>
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

        {!isEdit && (
          <>
            <label className="label">Solicitation Documents</label>
            <FileDropZone files={files} onChange={setFiles} />
          </>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Uploading…' : isEdit ? 'Save Changes' : 'Create Solicitation'}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(isEdit && existing ? `/solicitations/${existing.id}` : '/solicitations')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
};

export default SolicitationForm;
