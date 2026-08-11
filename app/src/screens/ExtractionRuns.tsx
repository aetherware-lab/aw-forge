import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtractionRunStatus, listExtractionRuns } from '@/lib/api';

const STATUS_LABELS: Record<ExtractionRunStatus['status'], string> = {
  pending: 'Pending',
  running: 'Running',
  complete: 'Complete',
  error: 'Error',
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

/**
 * Every extraction run the FORGE server knows about, regardless of whether
 * it was started from this app or directly against the API. The Solicitation
 * Page only shows runs it created itself — this is the fallback for finding
 * anything else, and the only way to reach a run made outside the UI.
 */
const ExtractionRuns: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<ExtractionRunStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listExtractionRuns()
      .then(setRuns)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not reach the FORGE server.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <div className="page-title">Extraction Runs</div>
          <div className="page-sub">Every run on the FORGE server, however it was started</div>
        </div>
        <div>
          <button type="button" className="btn ghost small" onClick={load}>
            ↻ Refresh
          </button>
        </div>
      </header>

      {loading && <div className="empty">Loading…</div>}

      {!loading && error && (
        <div className="empty" style={{ color: 'var(--crit)' }}>
          {error}
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="empty">No extraction runs on the server yet.</div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Solicitation</th>
                <th>Run</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 110 }}>Requirements</th>
                <th style={{ width: 160 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="clickable-row"
                  onClick={() => navigate(`/extraction/${run.id}/citations`)}
                >
                  <td>
                    <div>{run.solicitationTitle}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {run.solicitationNumber}
                      {run.solicitationAgency ? ` · ${run.solicitationAgency}` : ''}
                    </div>
                  </td>
                  <td>{run.name}</td>
                  <td>
                    <span className={`pill ${run.status}`}>{STATUS_LABELS[run.status]}</span>
                  </td>
                  <td className="mono">{run.status === 'complete' ? run.requirementCount : '—'}</td>
                  <td>{formatDate(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ExtractionRuns;
