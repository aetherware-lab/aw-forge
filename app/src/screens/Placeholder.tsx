import React from 'react';
import { Link, useParams } from 'react-router-dom';

interface Props {
  title: string;
  /** Wireframe screen number this stub stands in for, for orientation. */
  screen?: string;
}

/** Generic stub for routes that haven't been built out yet in the slice. */
const Placeholder: React.FC<Props> = ({ title, screen }) => {
  const params = useParams();
  return (
    <>
      <header className="page-header">
        <div>
          <div className="page-title">{title}</div>
          {screen && <div className="page-sub">{screen} · not yet built</div>}
        </div>
        <Link to="/solicitations" className="btn ghost small link-reset">
          ← Back to Solicitations
        </Link>
      </header>

      <div className="empty">
        <p style={{ margin: 0 }}>
          This screen is part of the wireframe but not yet implemented in the
          vertical slice.
        </p>
        {Object.keys(params).length > 0 && (
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            Route params: <code>{JSON.stringify(params)}</code>
          </p>
        )}
      </div>
    </>
  );
};

export default Placeholder;
