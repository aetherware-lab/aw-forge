import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TagInput from '@/components/TagInput';
import { useSolicitations } from '@/store/solicitations';
import type { NoticeType, Solicitation, TagKey } from '@/types';

interface Props {
  /** The solicitation being edited. "New Solicitation" is a modal — see
   * NewSolicitationModal.tsx — so this screen only ever edits. */
  existing: Solicitation;
}

const NOTICE_TYPES: NoticeType[] = [
  'Solicitation',
  'Sources Sought',
  'Pre-Solicitation',
  'Combined Synopsis/Solicitation',
  'Special Notice',
  'Award Notice',
];

const SolicitationForm: React.FC<Props> = ({ existing }) => {
  const navigate = useNavigate();
  const update = useSolicitations((s) => s.update);

  const [title, setTitle] = useState(existing.title);
  const [samUrl, setSamUrl] = useState(existing.samUrl ?? '');
  const [number, setNumber] = useState(existing.number);
  const [agency, setAgency] = useState(existing.agency);
  const [noticeType, setNoticeType] = useState<NoticeType>(existing.noticeType);
  const [responseDue, setResponseDue] = useState(
    existing.responseDue !== 'TBD' ? existing.responseDue : '',
  );
  const [tbd, setTbd] = useState(existing.responseDue === 'TBD');
  const [tags, setTags] = useState<TagKey[]>(existing.tags);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);

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
  };

  return (
    <form id="edit-solicitation-form" onSubmit={onSubmit}>
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

        {error && <div className="form-error">{error}</div>}
      </form>
  );
};

export default SolicitationForm;
