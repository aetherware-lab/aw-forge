import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Solicitation } from '@/types';

interface Props {
  sol: Solicitation;
  onEdit?: (id: string) => void;
}

/** Maps a tag key to its display label (falls back to the key). */
const TAG_LABELS: Record<string, string> = {
  hot: 'Hot',
  warm: 'Warm',
  tracking: 'Tracking',
  cold: 'Cold',
  pinned: 'Pinned',
  rebid: 'Re-bid',
  'topic-cmmc': 'CMMC',
  'topic-cyber': 'Cyber',
  'topic-cloud': 'Cloud',
  'topic-health': 'Healthcare',
  'topic-agency': 'USACE',
  'topic-draft': 'Draft RFP',
  'topic-renewal': 'Renewal',
  'topic-sources': 'Sources Sought',
};

const formatDue = (iso: string) => {
  if (iso === 'TBD') return 'TBD';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const SolicitationCard: React.FC<Props> = ({ sol, onEdit }) => {
  const navigate = useNavigate();

  return (
    <article className="sol-card">
      <div>
        <button
          type="button"
          className="sol-title"
          onClick={() => navigate(`/solicitations/${sol.id}`)}
        >
          {sol.title}
        </button>
        <div className="sol-meta">
          {sol.number} · {sol.agency} · Response due {formatDue(sol.responseDue)}
        </div>
        <div className="sol-tags">
          {sol.tags.map((t) => (
            <span key={t} className={`tag-pill ${t}`}>
              {TAG_LABELS[t] ?? t}
            </span>
          ))}
        </div>
        <div className="sol-progress">
          <div className="sol-progress-row">
            <span>{sol.stage}</span>
            <span>{sol.progress}%</span>
          </div>
          <div
            className="progress-shell"
            role="progressbar"
            aria-valuenow={sol.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${sol.progress}%` }} />
          </div>
        </div>
      </div>
      <div className="sol-actions">
        <button
          type="button"
          className="btn ghost small"
          onClick={() => onEdit?.(sol.id)}
        >
          Edit Solicitation
        </button>
      </div>
    </article>
  );
};

export default SolicitationCard;
