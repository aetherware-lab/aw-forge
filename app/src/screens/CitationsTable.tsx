import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSolicitations } from '@/store/solicitations';
import { SAMPLE_REQUIREMENTS } from '@/fixtures/requirements-sample';
import CitationDrawer from '@/components/CitationDrawer';
import ExportModal from '@/components/ExportModal';
import type {
  Citation,
  FlagSeverity,
  Requirement,
  RequirementType,
} from '@/types';

const TYPE_LABELS: Record<RequirementType, string> = {
  shall: 'Shall', will: 'Will', should: 'Should', may: 'May', must: 'Must',
};

const confidenceClass = (c: number): string => {
  if (c >= 95) return '';
  if (c >= 80) return 'good';
  if (c >= 60) return 'med';
  if (c >= 40) return 'low';
  return 'vlow';
};

const formatGenerated = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

const CitationsTable: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const documents = useSolicitations((s) => s.documents);
  const runDoc = useMemo(
    () => documents.find((d) => d.id === runId),
    [documents, runId],
  );

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequirementType | 'All'>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [reviewFilter, setReviewFilter] = useState<FlagSeverity | 'All' | 'Clean'>('All');
  const [drawer, setDrawer] = useState<{ req: Requirement; cite: Citation } | null>(null);
  const [showExport, setShowExport] = useState(false);

  const sections = useMemo(() => {
    const set = new Set(SAMPLE_REQUIREMENTS.map((r) => r.section));
    return ['All', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SAMPLE_REQUIREMENTS.filter((r) => {
      if (typeFilter !== 'All' && r.type !== typeFilter) return false;
      if (sectionFilter !== 'All' && r.section !== sectionFilter) return false;
      if (reviewFilter !== 'All') {
        if (reviewFilter === 'Clean' && r.flag) return false;
        if (reviewFilter !== 'Clean' && r.flag?.severity !== reviewFilter) return false;
      }
      if (!q) return true;
      return (
        r.text.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [query, typeFilter, sectionFilter, reviewFilter]);

  if (!runDoc) return <Navigate to="/dashboard" replace />;

  return (
    <>
      <button
        type="button"
        className="back-link"
        onClick={() => navigate(`/solicitations/${runDoc.solicitationId}`)}
      >
        ← Back to Solicitation
      </button>

      <header className="page-header" style={{ marginTop: 8 }}>
        <div>
          <div className="run-title">{runDoc.name}</div>
          <div className="run-sub">
            Generated {formatGenerated(runDoc.dateAdded)} · {SAMPLE_REQUIREMENTS.length} requirements
            {' · '}graphrag-validated
          </div>
        </div>
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => setShowExport(true)}
          >
            Export ▼
          </button>
        </div>
      </header>

      <div className="row tight" style={{ marginBottom: 12 }}>
        <input
          type="search"
          placeholder="🔍 Search requirements…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as RequirementType | 'All')}
        >
          <option value="All">Type: All</option>
          {(['shall','will','should','may','must'] as RequirementType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'Section: All' : s}
            </option>
          ))}
        </select>
        <select
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value as FlagSeverity | 'All' | 'Clean')}
        >
          <option value="All">Review: All</option>
          <option value="critical">Critical</option>
          <option value="important">Important</option>
          <option value="minor">Minor</option>
          <option value="Clean">Clean</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th style={{ width: 100 }}>Section</th>
              <th>Requirement</th>
              <th style={{ width: 80 }}>Type</th>
              <th style={{ width: 130 }}>Confidence</th>
              <th style={{ width: 160 }}>Citations</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                  No requirements match those filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td className="mono">{r.section}</td>
                  <td>
                    {r.text}
                    {r.flag && (
                      <div className={`flag ${r.flag.severity}`}>
                        <span className="flag-sev">{r.flag.severity}</span>
                        {r.flag.note}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${r.type}`}>{TYPE_LABELS[r.type]}</span>
                  </td>
                  <td>
                    <div className="confidence">
                      <span>{r.confidence}%</span>
                      <div className="conf-bar">
                        <div
                          className={`conf-fill ${confidenceClass(r.confidence)}`}
                          style={{ width: `${r.confidence}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    {r.citations.map((c, i) => (
                      <div key={c.label + i}>
                        {i + 1}.{' '}
                        <button
                          type="button"
                          className="cite-link"
                          onClick={() => setDrawer({ req: r, cite: c })}
                        >
                          {c.label}
                        </button>
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drawer && (
        <CitationDrawer
          requirement={drawer.req}
          citation={drawer.cite}
          onClose={() => setDrawer(null)}
        />
      )}

      {showExport && runId && (
        <ExportModal
          runId={runId}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
};

export default CitationsTable;
