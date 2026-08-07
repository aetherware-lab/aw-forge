import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSolicitations } from '@/store/solicitations';
import { getExtractionRunRequirements, getExtractionRunStatus } from '@/lib/api';
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

type Phase = 'loading' | 'pending' | 'running' | 'complete' | 'error';

const POLL_INTERVAL_MS = 2000;

const CitationsTable: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const documents = useSolicitations((s) => s.documents);
  const runDoc = useMemo(
    () => documents.find((d) => d.id === runId),
    [documents, runId],
  );

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await getExtractionRunStatus(runId);
        if (cancelled) return;

        if (status.status === 'error') {
          setPhase('error');
          setErrorMessage(status.error ?? 'Extraction failed.');
          return;
        }
        if (status.status === 'complete') {
          const reqs = await getExtractionRunRequirements(runId);
          if (cancelled) return;
          setRequirements(reqs);
          setPhase('complete');
          return;
        }
        setPhase(status.status);
        pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setPhase('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Could not reach the FORGE server.',
        );
      }
    };

    setPhase('loading');
    setErrorMessage(null);
    poll();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [runId]);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequirementType | 'All'>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [reviewFilter, setReviewFilter] = useState<FlagSeverity | 'All' | 'Clean'>('All');
  const [drawer, setDrawer] = useState<{ req: Requirement; cite: Citation } | null>(null);
  const [showExport, setShowExport] = useState(false);

  const sections = useMemo(() => {
    const set = new Set(requirements.map((r) => r.section));
    return ['All', ...Array.from(set)];
  }, [requirements]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requirements.filter((r) => {
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
  }, [requirements, query, typeFilter, sectionFilter, reviewFilter]);

  if (!runDoc) return <Navigate to="/dashboard" replace />;

  const statusLine = (): string => {
    if (phase === 'loading') return 'Checking run status…';
    if (phase === 'pending') return 'Queued — waiting for the server to pick this up…';
    if (phase === 'running') return 'Extracting requirements…';
    if (phase === 'error') return `Extraction failed: ${errorMessage}`;
    return `Generated ${formatGenerated(runDoc.dateAdded)} · ${requirements.length} requirements`;
  };

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
          <div className="run-sub" style={phase === 'error' ? { color: 'var(--crit)' } : undefined}>
            {statusLine()}
          </div>
        </div>
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => setShowExport(true)}
            disabled={phase !== 'complete'}
          >
            Export ▼
          </button>
        </div>
      </header>

      {phase !== 'complete' && phase !== 'error' && (
        <div className="empty" style={{ padding: 32 }}>
          {phase === 'loading' ? 'Checking run status…' : statusLine()}
        </div>
      )}

      {phase === 'error' && (
        <div className="empty" style={{ padding: 32, color: 'var(--crit)' }}>
          {errorMessage}
        </div>
      )}

      {phase === 'complete' && (
        <>
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
                      {requirements.length === 0
                        ? 'No requirements were extracted from this run.'
                        : 'No requirements match those filters.'}
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
        </>
      )}

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
          requirements={requirements}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
};

export default CitationsTable;
