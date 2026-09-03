import React, { useEffect, useRef, useState } from 'react';
import { ExtractionRunStatus } from '@/lib/api';
import {
  IconCheck,
  IconFileText,
  IconProps,
  IconSearch,
  IconShieldCheck,
  IconTable,
} from '@/components/Icon';

// Only the in-flight phases — CitationsTable stops rendering this card once
// the run reaches 'complete' or 'error' (it shows the results table or the
// error panel instead), so this component never needs to represent those.
type Phase = 'loading' | 'pending' | 'running';

interface Props {
  phase: Phase;
  runInfo: ExtractionRunStatus | null;
}

const STAGES: { key: string; label: string; icon: React.FC<IconProps> }[] = [
  { key: 'parsing', label: 'Parsing', icon: IconFileText },
  { key: 'extracting', label: 'Extracting', icon: IconSearch },
  { key: 'validating', label: 'Validating', icon: IconShieldCheck },
  { key: 'generating', label: 'Generating', icon: IconTable },
];

const stageIndex = (stage: string | null): number => {
  if (stage === 'generating') return 3;
  if (stage === 'validating') return 2;
  if (stage === 'extracting') return 1;
  return 0; // parsing, or not started yet — Parsing reads as "up next"
};

const fmtElapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

const fmtOffset = (ms: number): string => `${Math.max(0, ms / 1000).toFixed(1)}s`;

interface LogEntry { id: string; ts: number; text: string }

/**
 * "Agent Handoff"-style loading card for an in-flight extraction run —
 * a stage tracker (Parsing -> Extracting -> Validating -> Generating) plus
 * a running activity log built from server/app/pipeline.py's progress
 * updates, in place of the old bare spinner + progress bar.
 */
const ExtractionRunProgress: React.FC<Props> = ({ phase, runInfo }) => {
  const startRef = useRef<number>(Date.now());
  const [now, setNow] = useState(Date.now());
  const [log, setLog] = useState<LogEntry[]>([]);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (runInfo?.createdAt) {
      const t = new Date(runInfo.createdAt).getTime();
      if (!Number.isNaN(t)) startRef.current = t;
    }
  }, [runInfo?.createdAt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // A running history, not a single row that overwrites itself — every
  // genuinely new update (a new chunk parsed, a new extraction tick, a
  // stage starting/finishing) appends its own line. `key` dedupes so a
  // poll that finds nothing new doesn't repeat the last line.
  const append = (key: string, text: string) => {
    if (seen.current.has(key)) return;
    seen.current.add(key);
    setLog((prev) => [...prev, { id: key, ts: Date.now(), text }]);
  };

  useEffect(() => {
    if (phase === 'pending') append('queued', 'Run queued — waiting for the server to pick this up');
  }, [phase]);

  useEffect(() => {
    const stage = runInfo?.stage;
    if (!stage || !runInfo) return;
    const { stageCurrent: cur, stageTotal: total, requirementCount: reqs, chunkCount: chunks } = runInfo;

    if (stage === 'parsing') {
      append(
        `parsing:${cur}`,
        `Parsing documents (${cur}/${total}) — ${chunks} chunk${chunks === 1 ? '' : 's'} so far`,
      );
    } else if (stage === 'extracting') {
      // "chunk X/Y" — explicitly chunks, not requirements: each chunk yields
      // a variable, LLM-decided number of requirements, so there's no
      // knowable requirement total to show a fraction of until generating
      // (see below). The extracted count is a running tally alongside it,
      // once there's anything to show.
      append(
        `extracting:${cur}`,
        `Extracting requirements — chunk ${cur}/${total}${reqs > 0 ? ` (${reqs} extracted so far)` : ''}`,
      );
    } else if (stage === 'validating') {
      if (cur < total) append('validating:start', 'Validating extracted requirements…');
      else append('validating:done', 'Validator not implemented yet — skipping');
    } else if (stage === 'generating') {
      // Unlike extracting, the total here IS known — extraction has already
      // finished, so the final requirement count is just len(requirements).
      append('generating', `Generating citation table — ${reqs} requirement${reqs === 1 ? '' : 's'} generated`);
    }
  }, [runInfo?.stage, runInfo?.stageCurrent, runInfo?.stageTotal, runInfo?.requirementCount, runInfo?.chunkCount]);

  const idx = stageIndex(runInfo?.stage ?? null);
  const stageFrac = runInfo?.stageTotal ? runInfo.stageCurrent / runInfo.stageTotal : 0;
  const fillPct = Math.min(100, ((idx + stageFrac) / STAGES.length) * 100);
  // The most recently appended line is always the one actually in
  // progress — shimmer that rather than trying to re-match it to a stage.
  const activeLogId = log.length > 0 ? log[log.length - 1].id : null;

  return (
    <div className="handoff-card">
      <div className="handoff-head">
        <div className="handoff-title">{runInfo?.name ?? 'Extraction Run'}</div>
        <div className="handoff-timer mono">{fmtElapsed(now - startRef.current)}</div>
      </div>

      <div className="handoff-stages">
        {STAGES.map((s, i) => {
          const state = i < idx ? 'done' : i === idx ? 'active' : 'pending';
          const StageIcon = s.icon;
          return (
            <div key={s.key} className={`handoff-stage ${state}`}>
              <div className="handoff-stage-icon">
                {state === 'done' ? <IconCheck size={14} /> : <StageIcon size={14} />}
              </div>
              <div className="handoff-stage-label">{s.label}</div>
            </div>
          );
        })}
        <div className="handoff-stage-track">
          <div className="handoff-stage-fill" style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      <div className="handoff-log">
        <div className="handoff-log-head">
          <span>Activity Log</span>
          <span className="muted">{log.length}</span>
        </div>
        <div className="handoff-log-list">
          {log.length === 0 && <div className="handoff-log-empty">Waiting for the first update…</div>}
          {log.map((entry) => (
            <div
              key={entry.id}
              className={`handoff-log-row${entry.id === activeLogId ? ' is-active' : ''}`}
            >
              <span className="handoff-log-time mono">{fmtOffset(entry.ts - startRef.current)}</span>
              <span className="handoff-log-dot" />
              <span className="handoff-log-text">{entry.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExtractionRunProgress;
