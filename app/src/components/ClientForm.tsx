import React, { useState } from 'react';
import Modal from './Modal';
import { newClientId, useClients } from '@/store/clients';
import type { ClientProfile } from '@/types';

interface Props {
  existing?: ClientProfile;
  onClose: () => void;
}

const SET_ASIDE_SUGGESTIONS = ['8(a)', 'SDVOSB', 'WOSB', 'EDWOSB', 'HUBZone', 'VOSB', 'SDB'];

/** Add / edit a ClientProfile. Used by the Clients management screen. */
const ClientForm: React.FC<Props> = ({ existing, onClose }) => {
  const add = useClients((s) => s.add);
  const update = useClients((s) => s.update);
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [naics, setNaics] = useState(existing?.naics.join(', ') ?? '');
  const [setAsides, setSetAsides] = useState<string[]>(existing?.setAsides ?? []);
  const [capabilities, setCapabilities] = useState(existing?.capabilities.join(', ') ?? '');
  const [geographies, setGeographies] = useState(existing?.geographies?.join(', ') ?? '');
  const [error, setError] = useState<string | null>(null);

  const splitCsv = (s: string): string[] =>
    s.split(',').map((x) => x.trim()).filter(Boolean);

  const toggleSetAside = (key: string) => {
    setSetAsides((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  };

  const onSave = () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    const payload = {
      name: name.trim(),
      naics: splitCsv(naics),
      setAsides,
      capabilities: splitCsv(capabilities),
      geographies: geographies.trim() ? splitCsv(geographies) : undefined,
    };
    if (isEdit && existing) {
      update(existing.id, payload);
    } else {
      add({ id: newClientId(), ...payload });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Client' : 'New Client'}
      subtitle={
        isEdit
          ? 'Update the firm’s capture profile.'
          : 'Capture the firm so the matching engine can attribute leads + opportunities.'
      }
      maxWidth={560}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={onSave}>
            {isEdit ? 'Save Changes' : 'Create Client'}
          </button>
        </>
      }
    >
      <label className="label" htmlFor="cli-name">
        Company Name <span style={{ color: 'var(--note)' }}>*</span>
      </label>
      <input
        id="cli-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Acme Cyber Solutions"
        autoFocus
      />

      <label className="label" htmlFor="cli-naics">
        NAICS Codes{' '}
        <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
          (comma-separated 6-digit codes)
        </span>
      </label>
      <input
        id="cli-naics"
        type="text"
        value={naics}
        onChange={(e) => setNaics(e.target.value)}
        placeholder="541512, 541519, 541611"
      />

      <label className="label">Set-Aside Eligibility</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {SET_ASIDE_SUGGESTIONS.map((s) => {
          const sel = setAsides.includes(s);
          return (
            <button
              key={s}
              type="button"
              className={`tag-pill suggest-btn${sel ? ' selected-pill' : ''}`}
              onClick={() => toggleSetAside(s)}
            >
              {sel ? '✓ ' : ''}{s}
            </button>
          );
        })}
      </div>

      <label className="label" htmlFor="cli-cap">
        Capabilities{' '}
        <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
          (comma-separated)
        </span>
      </label>
      <input
        id="cli-cap"
        type="text"
        value={capabilities}
        onChange={(e) => setCapabilities(e.target.value)}
        placeholder="CMMC, Cyber Threat Intel, SOC Operations"
      />

      <label className="label" htmlFor="cli-geo">
        Geographies{' '}
        <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
          (optional)
        </span>
      </label>
      <input
        id="cli-geo"
        type="text"
        value={geographies}
        onChange={(e) => setGeographies(e.target.value)}
        placeholder="CONUS, OCONUS"
      />

      {error && <div className="form-error">{error}</div>}
    </Modal>
  );
};

export default ClientForm;
