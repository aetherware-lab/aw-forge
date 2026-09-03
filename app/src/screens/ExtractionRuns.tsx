import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtractionRunStatus, RunStatus, listExtractionRuns } from '@/lib/api';
import { IconRefresh } from '@/components/Icon';
import { useNotifications } from '@/store/notifications';

// Background poll so a run finishing while this screen (rather than its own
// CitationsTable page) is open still surfaces a notification. Gentler than
// CitationsTable's 2s single-run poll since this refetches every run on the
// server each tick.
const POLL_INTERVAL_MS = 8000;

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
  const notify = useNotifications((s) => s.add);
  // Last-seen status per run id — undefined on first load, so pre-existing
  // completed/errored runs don't fire a notification just for being here
  // when the screen mounts. Only a transition detected between two polls
  // (i.e. after the first) counts.
  const lastStatus = useRef<Map<string, RunStatus>>(new Map());

  const load = useCallback((opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    listExtractionRuns()
      .then((data) => {
        data.forEach((run) => {
          const prev = lastStatus.current.get(run.id);
          if (prev && prev !== run.status && (run.status === 'complete' || run.status === 'error')) {
            notify(
              {
                kind: run.status === 'complete' ? 'success' : 'error',
                title: run.status === 'complete' ? 'Extraction run complete' : 'Extraction run failed',
                body: `${run.name} · ${run.solicitationTitle}`,
              },
              `run:${run.id}:${run.status}`,
            );
          }
          lastStatus.current.set(run.id, run.status);
        });
        setRuns(data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not reach the FORGE server.'),
      )
      .finally(() => {
        if (!opts?.silent) setLoading(false);
      });
  }, [notify]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <>
      <header className="page-header">
        <div>
          <div className="page-title">Extraction Runs</div>
          <div className="page-sub">Every run on the FORGE server, however it was started</div>
        </div>
        <div>
          <button type="button" className="btn ghost small" onClick={() => load()}>
            <IconRefresh size={12} /> Refresh
          </button>
        </div>
      </header>

      {loading && <div className="empty">Loading…</div>}

      {!loading && error && (
        <div className="empty error">{error}</div>
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
                    <div className="meta-line sm">
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
