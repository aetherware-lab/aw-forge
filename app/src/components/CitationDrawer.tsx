import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Citation, Requirement } from '@/types';

interface Props {
  requirement: Requirement;
  /** The specific citation the user clicked, used for the eyebrow + heading */
  citation: Citation;
  onClose: () => void;
}

/**
 * Overlay B — right-side citation drawer. Shows the source snippet, file
 * pointer, related citations, and an "Open in PDF" stub action.
 */
const CitationDrawer: React.FC<Props> = ({ requirement, citation, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const otherCitations = requirement.citations.filter(
    (c) => c.label !== citation.label,
  );

  // Best-effort title from the citation label
  const title = `${citation.label} · ${requirement.section}`;

  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-scroll">
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>

          <div className="drawer-eyebrow">Citation</div>
          <div className="drawer-title">{title}</div>

          <div className="label">For Requirement</div>
          <div className="drawer-block">
            <strong className="mono" style={{ fontSize: 11, marginRight: 6 }}>
              {requirement.id}:
            </strong>
            {requirement.text}
          </div>

          {requirement.flag && (
            <div className={`flag ${requirement.flag.severity}`}>
              <span className="flag-sev">{requirement.flag.severity}</span>
              {requirement.flag.note}
            </div>
          )}

          <div className="label">Source Snippet</div>
          <div className="drawer-block solid" style={{ minHeight: 100 }}>
            {citation.verbatimText ? (
              <>&ldquo;{citation.verbatimText}&rdquo;</>
            ) : (
              <em>No source snippet available.</em>
            )}
          </div>

          <div className="label">Source</div>
          <div className="drawer-block" style={{ marginBottom: 12 }}>
            {citation.label}
            {citation.page ? ` · p. ${citation.page}` : ''}
          </div>

          {otherCitations.length > 0 && (
            <>
              <div className="label">Related Citations</div>
              <div className="drawer-block">
                {otherCitations.map((c, i) => (
                  <div key={c.label + i}>
                    · <span className="cite-link">{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="drawer-footer">
          <button
            type="button"
            className="btn full"
            onClick={() => {
              // Stub — will jump into a bundled PDF viewer once docs are real.
              // eslint-disable-next-line no-console
              console.log('Open in PDF:', citation);
            }}
          >
            📄 Open in PDF
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
};

export default CitationDrawer;
