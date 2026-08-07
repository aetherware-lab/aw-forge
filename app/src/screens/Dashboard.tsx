import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SolicitationCard from '@/components/SolicitationCard';
import { useSolicitations } from '@/store/solicitations';

type SortMode = 'due' | 'progress' | 'title';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // Subscribe to the live list — newly created solicitations show up here.
  const solicitations = useSolicitations((s) => s.solicitations);

  const [query, setQuery] = useState('');
  const [agency, setAgency] = useState<string>('all');
  const [tag, setTag] = useState<string>('all');
  const [sort, setSort] = useState<SortMode>('due');

  const agencies = useMemo(() => {
    const set = new Set(solicitations.map((s) => s.agency));
    return ['all', ...Array.from(set)];
  }, [solicitations]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    solicitations.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return ['all', ...Array.from(set)];
  }, [solicitations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = solicitations.filter((s) => {
      if (agency !== 'all' && s.agency !== agency) return false;
      if (tag !== 'all' && !s.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.number.toLowerCase().includes(q) ||
        s.agency.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sort === 'progress') return b.progress - a.progress;
      if (sort === 'title') return a.title.localeCompare(b.title);
      const aDue = a.responseDue === 'TBD' ? Infinity : new Date(a.responseDue).getTime();
      const bDue = b.responseDue === 'TBD' ? Infinity : new Date(b.responseDue).getTime();
      return aDue - bDue;
    });

    return list;
  }, [solicitations, query, agency, tag, sort]);

  return (
    <>
      <header className="page-header">
        <div>
          <div className="page-title">Solicitations</div>
          <div className="page-sub">
            {solicitations.length} tracked · sorted by{' '}
            {sort === 'due' ? 'response date' : sort === 'progress' ? 'progress' : 'title'}
          </div>
        </div>
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/solicitations/new')}
          >
            + New Solicitation
          </button>
        </div>
      </header>

      <div className="row tight" style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="🔍  Search solicitations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? 'Tags: All' : `Tag: ${t}`}
            </option>
          ))}
        </select>
        <select value={agency} onChange={(e) => setAgency(e.target.value)}>
          {agencies.map((a) => (
            <option key={a} value={a}>
              {a === 'all' ? 'Agency: All' : a}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
          <option value="due">Sort: Response date</option>
          <option value="progress">Sort: Progress</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {solicitations.length === 0
            ? 'No solicitations yet — click + New Solicitation to add one.'
            : 'No solicitations match those filters.'}
        </div>
      ) : (
        filtered.map((sol) => (
          <SolicitationCard
            key={sol.id}
            sol={sol}
            onEdit={(id) => navigate(`/solicitations/${id}/edit`)}
          />
        ))
      )}
    </>
  );
};

export default Dashboard;
