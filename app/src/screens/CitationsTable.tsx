import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSolicitations } from '@/store/solicitations';
import {
  ExtractionRunStatus,
  getExtractionRunRequirements,
  getExtractionRunStatus,
} from '@/lib/api';
import CitationDrawer from '@/components/CitationDrawer';
import ExportModal from '@/components/ExportModal';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconInfo,
  IconLoader,
  IconSearch,
} from '@/components/Icon';
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

const FLAG_ICON: Record<FlagSeverity, React.FC<{ size?: number }>> = {
  critical: IconAlertTriangle,
  important: IconAlertCircle,
  minor: IconInfo,
};

/** Pipeline stages, as reported by server/app/pipeline.py's set_run_progress calls. */
const STAGE_LABELS: Record<string, string> = {
  parsing: 'Parsing documents',
  extracting: 'Extracting requirements',
  writing: 'Writing to the knowledge graph',
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

  // A local doc record only exists if this run was started from inside this
  // app (NewExtractionRunModal creates one). Runs started directly against
  // the server — via curl, a script, whatever — have no local record, so
  // everything this screen needs to render has to come from the server
  // response, not from this optional local lookup.
  const documents = useSolicitations((s) => s.documents);
  const runDoc = useMemo(
    () => documents.find((d) => d.id === runId),
    [documents, runId],
  );

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runInfo, setRunInfo] = useState<ExtractionRunStatus | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await getExtractionRunStatus(runId);
        if (cancelled) return;
        setRunInfo(status);

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

  if (!runId) return <Navigate to="/solicitations" replace />;

  const runName = runInfo?.name ?? runDoc?.name ?? 'Extraction Run';

  // Verbose stage line, e.g. "Extracting requirements… (7 / 23)" — falls
  // back to a generic phase label until the server's first progress update
  // for this run comes in (see server/app/pipeline.py).
  const stageLine = (): string | null => {
    if (!runInfo?.stage) return null;
    const label = STAGE_LABELS[runInfo.stage] ?? runInfo.stage;
    return runInfo.stageTotal > 0
      ? `${label}… (${runInfo.stageCurrent} / ${runInfo.stageTotal})`
      : `${label}…`;
  };

  const statusLine = (): string => {
    if (phase === 'loading') return 'Checking run status…';
    if (phase === 'error') return `Extraction failed: ${errorMessage}`;
    if (phase === 'pending') return stageLine() ?? 'Queued — waiting for the server to pick this up…';
    if (phase === 'running') return stageLine() ?? 'Extracting requirements…';
    const generated = runInfo ? formatGenerated(runInfo.createdAt) : '';
    return `Generated ${generated} · ${requirements.length} requirements`;
  };

  return (
    <>
      <button
        type="button"
        className="back-link"
        onClick={() =>
          runDoc
            ? navigate(`/solicitations/${runDoc.solicitationId}`)
            : navigate('/extraction-runs')
        }
      >
        {runDoc ? '← Back to Solicitation' : '← Back to Extraction Runs'}
      </button>

      <header className="page-header">
        <div>
          <div className="run-title">{runName}</div>
          {runInfo && (
            <div className="meta-line">
              {runInfo.solicitationTitle} · {runInfo.solicitationNumber}
            </div>
          )}
          <div className={`run-sub${phase === 'error' ? ' error' : ''}`}>
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
        <div className="empty run-progress">
          <IconLoader size={22} className="spin" />
          <div className="run-progress-label">
            {phase === 'loading' ? 'Checking run status…' : statusLine()}
          </div>
          {runInfo?.stage && runInfo.stageTotal > 0 && (
            <div className="progress-shell run-progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.round((runInfo.stageCurrent / runInfo.stageTotal) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="empty error">
          {errorMessage}
        </div>
      )}

      {phase === 'complete' && (
        <>
          <div className="row tight toolbar-row">
            <div className="search-field w-md">
              <IconSearch size={14} />
              <input
                type="search"
                placeholder="Search requirements…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
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
                  <th style={{ width: 140 }}>Confidence</th>
                  <th style={{ width: 160 }}>Citations</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty-cell">
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
                            {(() => {
                              const FlagIcon = FLAG_ICON[r.flag.severity];
                              return <FlagIcon size={12} />;
                            })()}
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
                          <span className="confidence-pct">{r.confidence}%</span>
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
