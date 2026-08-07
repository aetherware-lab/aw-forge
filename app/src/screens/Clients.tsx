import React, { useMemo, useState } from 'react';
import { useClients } from '@/store/clients';
import ClientForm from '@/components/ClientForm';
import type { ClientProfile } from '@/types';

const Clients: React.FC = () => {
  const clients = useClients((s) => s.clients);
  const remove = useClients((s) => s.remove);

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ClientProfile | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.naics.some((n) => n.includes(q)) ||
        c.capabilities.some((cap) => cap.toLowerCase().includes(q)) ||
        c.setAsides.some((sa) => sa.toLowerCase().includes(q)),
    );
  }, [clients, query]);

  const confirmRemove = (c: ClientProfile) => {
    const ok = window.confirm(
      `Remove "${c.name}"? This won't delete recommendations that referenced it, but they'll show "Unknown client" until you re-add.`,
    );
    if (ok) remove(c.id);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <div className="page-title">Clients</div>
          <div className="page-sub">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} in your portfolio
          </div>
        </div>
        <div>
          <button type="button" className="btn" onClick={() => setShowAdd(true)}>
            + New Client
          </button>
        </div>
      </header>

      <div className="row tight" style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="🔍 Search by name, NAICS, capability, set-aside…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 320 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {clients.length === 0
            ? 'No clients yet — click + New Client to add your first.'
            : 'No clients match that search.'}
        </div>
      ) : (
        filtered.map((c) => (
          <article key={c.id} className="client-card">
            <div>
              <div className="client-name">{c.name}</div>
              <div className="client-meta">
                {c.naics.length > 0 && (
                  <span>NAICS {c.naics.join(', ')}</span>
                )}
                {c.geographies && c.geographies.length > 0 && (
                  <span>{c.geographies.join(' · ')}</span>
                )}
              </div>

              {c.setAsides.length > 0 && (
                <div className="client-section">
                  <div className="client-section-label">Set-asides</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {c.setAsides.map((sa) => (
                      <span key={sa} className="tag-pill">{sa}</span>
                    ))}
                  </div>
                </div>
              )}

              {c.capabilities.length > 0 && (
                <div className="client-section">
                  <div className="client-section-label">Capabilities</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {c.capabilities.map((cap) => (
                      <span key={cap} className="tag-pill">{cap}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="client-actions">
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setEditing(c)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => confirmRemove(c)}
                title="Remove client"
                style={{ color: 'var(--crit)' }}
              >
                Remove
              </button>
            </div>
          </article>
        ))
      )}

      {showAdd && <ClientForm onClose={() => setShowAdd(false)} />}
      {editing && (
        <ClientForm existing={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
};

export default Clients;
