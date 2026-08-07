import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { newId, useSolicitations } from '@/store/solicitations';
import { useClients } from '@/store/clients';
import { RECOMMENDATIONS } from '@/fixtures/recommendations';
import type { Recommendation, Solicitation, TagKey } from '@/types';

type SortMode = 'score' | 'posted' | 'due';

const matchClass = (score: number): string => {
  if (score >= 90) return 'high';
  if (score >= 75) return 'good';
  if (score >= 60) return 'med';
  return 'low';
};

const matchLabel = (score: number): string => {
  if (score >= 90) return 'Strong match';
  if (score >= 75) return 'Good match';
  if (score >= 60) return 'Possible match';
  return 'Weak match';
};

const formatDate = (iso: string): string => {
  if (iso === 'TBD') return 'TBD';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  });
};

const formatPosted = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(diffMs / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const Feed: React.FC = () => {
  const navigate = useNavigate();
  const addSolicitation = useSolicitations((s) => s.add);
  // Subscribe to the raw list, then derive the lookup Set in useMemo —
  // constructing a Set inside the selector would return a new reference
  // every snapshot read and trip useSyncExternalStore's tear detection.
  const solicitations = useSolicitations((s) => s.solicitations);
  const trackedNumbers = useMemo(
    () => new Set(solicitations.map((x) => x.number)),
    [solicitations],
  );

  const clients = useClients((s) => s.clients);

  const [profileId, setProfileId] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [sort, setSort] = useState<SortMode>('score');

  const profileById = useMemo(() => {
    const m = new Map(clients.map((p) => [p.id, p]));
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    let list = RECOMMENDATIONS.filter((r) => {
      if (profileId !== 'all' && r.profileId !== profileId) return false;
      if (r.matchScore < minScore) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'posted') return a.postedAt < b.postedAt ? 1 : -1;
      if (sort === 'due') {
        const aDue = a.responseDue === 'TBD' ? Infinity : new Date(a.responseDue).getTime();
        const bDue = b.responseDue === 'TBD' ? Infinity : new Date(b.responseDue).getTime();
        return aDue - bDue;
      }
      return b.matchScore - a.matchScore;
    });
    return list;
  }, [profileId, minScore, sort]);

  const handleTrack = (rec: Recommendation) => {
    const id = newId('sol');
    const tags: TagKey[] = ['warm', ...(rec.tags ?? [])];
    const sol: Solicitation = {
      id,
      title: rec.title,
      number: rec.number,
      agency: rec.agency,
      responseDue: rec.responseDue,
      noticeType: rec.noticeType,
      tags,
      stage: 'Imported from Opportunities',
      progress: 4,
      samUrl: rec.samUrl,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    addSolicitation(sol);
    navigate(`/solicitations/${id}`);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <div className="page-title">Opportunities</div>
          <div className="page-sub">
            Recommended solicitations matched against {clients.length} client{' '}
            {clients.length === 1 ? 'profile' : 'profiles'} ·{' '}
            {filtered.length} of {RECOMMENDATIONS.length} shown
          </div>
        </div>
      </header>

      <div className="row tight" style={{ marginBottom: 16 }}>
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          style={{ minWidth: 220 }}
        >
          <option value="all">Profile: All clients</option>
          {clients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={String(minScore)}
          onChange={(e) => setMinScore(Number(e.target.value))}
        >
          <option value="0">Min match: Any</option>
          <option value="60">Min match: 60%</option>
          <option value="75">Min match: 75%</option>
          <option value="90">Min match: 90%</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
        >
          <option value="score">Sort: Match score</option>
          <option value="posted">Sort: Recently posted</option>
          <option value="due">Sort: Response due</option>
        </select>
      </div>

      <p className="muted" style={{ fontSize: 11, marginBottom: 16 }}>
        Stub feed. Real recommendations land once the matching engine pulls
        SAM.gov against your saved client profiles.
      </p>

      {filtered.length === 0 ? (
        <div className="feed-empty">
          No recommendations match those filters. Try lowering the min match
          or selecting a different profile.
        </div>
      ) : (
        filtered.map((rec) => {
          const profile = profileById.get(rec.profileId);
          const cls = matchClass(rec.matchScore);
          const alreadyTracked = trackedNumbers.has(rec.number);
          return (
            <article key={rec.id} className="feed-card">
              <div>
                <div className="feed-card-title">{rec.title}</div>
                <div className="feed-card-meta">
                  {rec.number} · {rec.agency} · Response due {formatDate(rec.responseDue)} · Posted {formatPosted(rec.postedAt)}
                </div>
                {profile && (
                  <div className="feed-card-attr">
                    Matched for <strong>{profile.name}</strong>
                  </div>
                )}
                <div className="feed-reasons">
                  {rec.matchedOn.map((reason) => (
                    <span key={reason} className="feed-reason">{reason}</span>
                  ))}
                </div>
                {rec.tags && rec.tags.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' }}>
                    {rec.tags.map((t) => (
                      <span key={t} className={`tag-pill ${t}`}>{t.replace(/^topic-/, '')}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="feed-match">
                <span className={`match-badge ${cls}`}>
                  <span className="match-score">{rec.matchScore}%</span>
                  <span>· {matchLabel(rec.matchScore)}</span>
                </span>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => handleTrack(rec)}
                  disabled={alreadyTracked}
                  title={
                    alreadyTracked
                      ? 'Already in your tracked solicitations'
                      : 'Add this to tracked solicitations'
                  }
                >
                  {alreadyTracked ? 'Tracked' : 'Track this'}
                </button>
              </div>
            </article>
          );
        })
      )}
    </>
  );
};

export default Feed;
