import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEADS } from '@/fixtures/leads';
import { newClientId, useClients } from '@/store/clients';
import type { Lead } from '@/types';

type SortMode = 'score' | 'recent';

const matchClass = (s: number): string => {
  if (s >= 90) return 'high';
  if (s >= 75) return 'good';
  if (s >= 60) return 'med';
  return 'low';
};

const matchLabel = (s: number): string => {
  if (s >= 90) return 'Strong match';
  if (s >= 75) return 'Good match';
  if (s >= 60) return 'Possible match';
  return 'Weak match';
};

const formatRelative = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(diff / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const clients = useClients((s) => s.clients);
  const addClient = useClients((s) => s.add);

  const knownClientNames = useMemo(
    () => new Set(clients.map((c) => c.name.toLowerCase())),
    [clients],
  );

  const [segment, setSegment] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [sort, setSort] = useState<SortMode>('score');

  const segments = useMemo(() => {
    const set = new Set(LEADS.map((l) => l.segment));
    return ['all', ...Array.from(set)];
  }, []);
  const sources = useMemo(() => {
    const set = new Set(LEADS.map((l) => l.source));
    return ['all', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    let list = LEADS.filter((l) => {
      if (segment !== 'all' && l.segment !== segment) return false;
      if (source !== 'all' && l.source !== source) return false;
      if (l.matchScore < minScore) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'recent') return a.surfacedAt < b.surfacedAt ? 1 : -1;
      return b.matchScore - a.matchScore;
    });
    return list;
  }, [segment, source, minScore, sort]);

  const handleAddAsClient = (lead: Lead) => {
    addClient({
      id: newClientId(),
      name: lead.name,
      naics: lead.naics,
      setAsides: [],
      capabilities: lead.capabilities ?? [],
      geographies: lead.hqLocation ? [lead.hqLocation] : undefined,
    });
    navigate('/clients');
  };

  return (
    <>
      <header className="page-header">
        <div>
          <div className="page-title">Leads</div>
          <div className="page-sub">
            Recommended prospect companies · {filtered.length} of {LEADS.length} shown
          </div>
        </div>
      </header>

      <div className="row tight" style={{ marginBottom: 16 }}>
        <select value={segment} onChange={(e) => setSegment(e.target.value)} style={{ minWidth: 200 }}>
          {segments.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Segment: All' : s}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          {sources.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Source: All' : s}</option>
          ))}
        </select>
        <select value={String(minScore)} onChange={(e) => setMinScore(Number(e.target.value))}>
          <option value="0">Min match: Any</option>
          <option value="60">Min match: 60%</option>
          <option value="75">Min match: 75%</option>
          <option value="90">Min match: 90%</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
          <option value="score">Sort: Match score</option>
          <option value="recent">Sort: Recently surfaced</option>
        </select>
      </div>

      <p className="muted" style={{ fontSize: 11, marginBottom: 16 }}>
        Stub feed. Real prospect recommendations land once the discovery engine pulls SAM.gov, GovWin, and USAspending against your offering.
      </p>

      {filtered.length === 0 ? (
        <div className="feed-empty">
          No leads match those filters. Try lowering min match or widening the segment/source.
        </div>
      ) : (
        filtered.map((lead) => {
          const cls = matchClass(lead.matchScore);
          const alreadyClient = knownClientNames.has(lead.name.toLowerCase());
          return (
            <article key={lead.id} className="feed-card">
              <div>
                <div className="feed-card-title">{lead.name}</div>
                <div className="feed-card-meta">
                  {lead.segment}
                  {lead.hqLocation && ` · ${lead.hqLocation}`}
                  {lead.annualSpend && ` · Est. ${lead.annualSpend} / yr`}
                  {' · Surfaced '}{formatRelative(lead.surfacedAt)}
                  {' · '}<span className="source-pill">{lead.source}</span>
                </div>
                {lead.naics.length > 0 && (
                  <div className="feed-card-attr">
                    NAICS <strong>{lead.naics.join(', ')}</strong>
                  </div>
                )}
                <div className="feed-reasons">
                  {lead.matchedOn.map((reason) => (
                    <span key={reason} className="feed-reason">{reason}</span>
                  ))}
                </div>
                {lead.capabilities && lead.capabilities.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {lead.capabilities.map((cap) => (
                      <span key={cap} className="tag-pill">{cap}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="feed-match">
                <span className={`match-badge ${cls}`}>
                  <span className="match-score">{lead.matchScore}%</span>
                  <span>· {matchLabel(lead.matchScore)}</span>
                </span>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => handleAddAsClient(lead)}
                  disabled={alreadyClient}
                  title={
                    alreadyClient
                      ? 'Already in your client portfolio'
                      : 'Add this firm as a client profile'
                  }
                >
                  {alreadyClient ? 'In Clients' : 'Add as Client'}
                </button>
              </div>
            </article>
          );
        })
      )}
    </>
  );
};

export default Leads;
