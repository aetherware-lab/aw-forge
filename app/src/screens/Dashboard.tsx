import React, { useMemo, useState } from 'react';
import SolicitationCard from '@/components/SolicitationCard';
import NewSolicitationModal from '@/components/NewSolicitationModal';
import { useSolicitations } from '@/store/solicitations';
import { IconPlus, IconSearch } from '@/components/Icon';

type SortMode = 'due' | 'progress' | 'title';

const Dashboard: React.FC = () => {
  // Subscribe to the live list — newly created solicitations show up here.
  const solicitations = useSolicitations((s) => s.solicitations);

  const [query, setQuery] = useState('');
  const [agency, setAgency] = useState<string>('all');
  const [tag, setTag] = useState<string>('all');
  const [sort, setSort] = useState<SortMode>('due');
  const [showNewModal, setShowNewModal] = useState(false);

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
          <div className="page-title">Solicitations ({solicitations.length})</div>
        </div>
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => setShowNewModal(true)}
          >
            <IconPlus size={14} /> New Solicitation
          </button>
        </div>
      </header>

      <div className="row tight toolbar-row">
        <div className="search-field w-lg">
          <IconSearch size={14} />
          <input
            type="search"
            placeholder="Search solicitations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <select
            className="filter-select"
            title="Filter by tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All tags' : t}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            title="Filter by agency"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
          >
            {agencies.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? 'All agencies' : a}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            title="Sort order"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            <option value="due">Due date</option>
            <option value="progress">Progress</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {solicitations.length === 0
            ? 'No solicitations yet — click + New Solicitation to add one.'
            : 'No solicitations match those filters.'}
        </div>
      ) : (
        filtered.map((sol) => (
          <SolicitationCard key={sol.id} sol={sol} />
        ))
      )}

      {showNewModal && <NewSolicitationModal onClose={() => setShowNewModal(false)} />}
    </>
  );
};

export default Dashboard;
