import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSolicitations } from '@/store/solicitations';
import NewExtractionRunModal from '@/components/NewExtractionRunModal';
import type { DocumentType, SolicitationDocument } from '@/types';

const TAG_LABELS: Record<string, string> = {
  hot: 'Hot', warm: 'Warm', tracking: 'Tracking', cold: 'Cold',
  pinned: 'Pinned', rebid: 'Re-bid',
  'topic-cmmc': 'CMMC', 'topic-cyber': 'Cyber', 'topic-cloud': 'Cloud',
  'topic-health': 'Healthcare', 'topic-agency': 'USACE',
  'topic-draft': 'Draft RFP', 'topic-renewal': 'Renewal',
  'topic-sources': 'Sources Sought',
};

const formatDate = (iso: string): string => {
  if (iso === 'TBD') return 'TBD';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  });
};

const formatNewsDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

const DOC_SECTIONS: { label: string; types: DocumentType[] }[] = [
  { label: 'Source Documents', types: ['RFP', 'PWS', 'Attachment', 'Amendment'] },
  { label: 'Opportunity Performance Reports (OPR)', types: ['OPR'] },
  { label: 'Extraction Runs', types: ['Extraction Run'] },
  { label: 'Proposals', types: ['Proposal'] },
];

const SolicitationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Subscribe to raw arrays — Zustand reuses references between renders
  // until a real mutation occurs.
  const solicitations = useSolicitations((s) => s.solicitations);
  const allDocuments = useSolicitations((s) => s.documents);
  const allNews = useSolicitations((s) => s.news);
  const togglePin = useSolicitations((s) => s.togglePin);

  const sol = useMemo(
    () => (id ? solicitations.find((s) => s.id === id) : undefined),
    [solicitations, id],
  );
  const docsForSol = useMemo(
    () => (id ? allDocuments.filter((d) => d.solicitationId === id) : []),
    [allDocuments, id],
  );
  const newsForSol = useMemo(
    () =>
      id
        ? allNews
            .filter((n) => n.solicitationId === id)
            .sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1))
        : [],
    [allNews, id],
  );

  const [docQuery, setDocQuery] = useState('');
  const [docType, setDocType] = useState<DocumentType | 'All'>('All');
  const [showNewRunModal, setShowNewRunModal] = useState(false);

  const filteredDocs = useMemo(() => {
    const q = docQuery.trim().toLowerCase();
    return docsForSol.filter((d) => {
      if (docType !== 'All' && d.type !== docType) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.sub.toLowerCase().includes(q);
    });
  }, [docsForSol, docQuery, docType]);

  const pinnedDocs = useMemo(
    () => filteredDocs.filter((d) => d.pinned),
    [filteredDocs],
  );

  if (!sol) return <Navigate to="/dashboard" replace />;

  return (
    <>
      <button
        type="button"
        className="back-link"
        onClick={() => navigate('/dashboard')}
      >
        ← Back to Solicitations
      </button>

      <div className="sol-header" style={{ marginTop: 8 }}>
        <div>
          <div className="sol-header-title">{sol.title}</div>
          <div className="sol-header-meta">
            <span>{sol.number}</span>
            <span>{sol.agency}</span>
            <span>Response due {formatDate(sol.responseDue)}</span>
            <span>Created {formatDate(sol.createdAt)}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            {sol.tags.map((t) => (
              <span key={t} className={`tag-pill ${t}`}>
                {TAG_LABELS[t] ?? t}
              </span>
            ))}
            <button
              type="button"
              className="tag-pill suggest"
              onClick={() => navigate(`/solicitations/${sol.id}/edit`)}
            >
              + Add tag
            </button>
          </div>
        </div>
        <div>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => navigate(`/solicitations/${sol.id}/edit`)}
          >
            Edit Solicitation
          </button>
        </div>
      </div>

      <div className="pipeline-bar">
        <div className="pipeline-bar-row">
          <span>Pipeline · {sol.stage}</span>
          <span>{sol.progress}%</span>
        </div>
        <div className="progress-shell">
          <div className="progress-fill" style={{ width: `${sol.progress}%` }} />
        </div>
      </div>

      <div className="sol-layout">
        <section className="panel">
          <div className="panel-head">
            <span>Documents</span>
            <button
              type="button"
              className="btn small"
              style={{ padding: '5px 10px', fontSize: 11 }}
              onClick={() => setShowNewRunModal(true)}
            >
              + New ▼
            </button>
          </div>
          <div className="panel-body">
            <div className="row tight" style={{ marginBottom: 10 }}>
              <input
                type="search"
                placeholder="🔍 Search documents…"
                value={docQuery}
                onChange={(e) => setDocQuery(e.target.value)}
                style={{ minWidth: 200, fontSize: 12, padding: '7px 10px' }}
              />
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType | 'All')}
                style={{ fontSize: 12, padding: '7px 10px' }}
              >
                <option value="All">Type: All</option>
                {(['RFP','PWS','Attachment','Amendment','OPR','Extraction Run','Proposal'] as DocumentType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="empty">No documents match those filters.</div>
            ) : (
              <>
                {pinnedDocs.length > 0 && (
                  <>
                    <div className="doc-section-head">⚑ Pinned</div>
                    {pinnedDocs.map((d) => (
                      <DocumentRow
                        key={d.id}
                        doc={d}
                        onTogglePin={() => togglePin(d.id)}
                      />
                    ))}
                  </>
                )}

                {DOC_SECTIONS.map((section) => {
                  const items = filteredDocs.filter(
                    (d) => !d.pinned && section.types.includes(d.type),
                  );
                  if (items.length === 0) return null;
                  return (
                    <React.Fragment key={section.label}>
                      <div className="doc-section-head">{section.label}</div>
                      {items.map((d) => (
                        <DocumentRow
                          key={d.id}
                          doc={d}
                          onTogglePin={() => togglePin(d.id)}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <span>News from SAM.gov</span>
            <button type="button" className="panel-link">Sync now</button>
          </div>
          <div className="panel-body">
            {newsForSol.length === 0 ? (
              <div className="empty">No SAM.gov news yet for this solicitation.</div>
            ) : (
              newsForSol.map((n) => (
                <div key={n.id} className="news-item">
                  <div>
                    <span className={`news-badge ${n.kind}`}>
                      {n.kind === 'amend' ? 'Amendment'
                        : n.kind === 'extend' ? 'Extension'
                        : n.kind === 'qa' ? 'Q&A'
                        : 'Attachment'}
                    </span>
                    <strong>{n.title}</strong>
                  </div>
                  <div style={{ marginTop: 4 }}>{n.body}</div>
                  <div className="news-date">{formatNewsDate(n.postedAt)}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {showNewRunModal && (
        <NewExtractionRunModal
          solicitationId={sol.id}
          onClose={() => setShowNewRunModal(false)}
        />
      )}
    </>
  );
};

interface DocumentRowProps {
  doc: SolicitationDocument;
  onTogglePin: () => void;
}

const DocumentRow: React.FC<DocumentRowProps> = ({ doc, onTogglePin }) => {
  const navigate = useNavigate();
  const isExtractionRun = doc.type === 'Extraction Run';
  return (
    <div className="doc-row">
      <button
        type="button"
        className={`pin ${doc.pinned ? 'active' : ''}`}
        onClick={onTogglePin}
        aria-label={doc.pinned ? 'Unpin' : 'Pin'}
      >
        {doc.pinned ? '★' : '☆'}
      </button>
      <div>
        <div className="doc-name">{doc.name}</div>
        <div className="doc-sub">{doc.sub}</div>
      </div>
      <div className="doc-type">{doc.type}</div>
      <button
        type="button"
        className="open-link"
        onClick={() => {
          if (isExtractionRun) navigate(`/extraction/${doc.id}/citations`);
        }}
      >
        Open
      </button>
    </div>
  );
};

export default SolicitationPage;
