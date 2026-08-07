import React from 'react';

interface State {
  error: Error | null;
  info: string | null;
}

/**
 * Renders a real error message instead of a blank page when a child throws.
 * Useful while iterating without a backend — a single typo in a selector
 * shouldn't make the whole window go white.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the stack in DevTools too
    // eslint-disable-next-line no-console
    console.error('Caught render error:', error, info);
    this.setState({ info: info.componentStack ?? null });
  }

  reset = () => this.setState({ error: null, info: null });

  reload = () => window.location.reload();

  clearStorage = () => {
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ padding: 32, fontFamily: 'inherit' }}>
        <div
          style={{
            border: '2px solid var(--crit)',
            background: 'var(--crit-bg)',
            color: '#7f1d1d',
            padding: 20,
            borderRadius: 4,
            maxWidth: 760,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            Something rendered with an error.
          </div>
          <div style={{ fontSize: 13, marginBottom: 12, fontFamily: 'monospace' }}>
            {error.name}: {error.message}
          </div>
          {info && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                Component stack
              </summary>
              <pre
                style={{
                  fontSize: 11,
                  whiteSpace: 'pre-wrap',
                  margin: '8px 0 0',
                }}
              >
                {info}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn small" onClick={this.reset}>
              Try again
            </button>
            <button type="button" className="btn ghost small" onClick={this.reload}>
              Reload window
            </button>
            <button
              type="button"
              className="btn ghost small"
              onClick={this.clearStorage}
              title="Drop persisted state and reload (useful if a fixture-shape change broke things)"
            >
              Clear storage &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
