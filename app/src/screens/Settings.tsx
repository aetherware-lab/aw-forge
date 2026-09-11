import React, { useEffect, useState } from 'react';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useAuth } from '@/store/auth';
import { THEMES } from '@/themes';
import { useTheme } from '@/store/theme';

const STATE_LABELS: Record<BackendStatus['state'], string> = {
  idle: 'Not started',
  starting: 'Starting…',
  running: 'Running',
  error: 'Error',
};

/**
 * User settings. Theme picker lives here; future sections (profile,
 * keyboard shortcuts, default tags, integrations) drop into this same
 * scaffold without changing routing.
 */
const Settings: React.FC = () => {
  const user = useAuth((s) => s.user);
  const themeId = useTheme((s) => s.themeId);
  const activeTheme = THEMES.find((t) => t.id === themeId);

  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    if (!window.forge) return;
    window.forge.backend.getConfig().then(setBackendConfig);
    window.forge.backend.getStatus().then(setBackendStatus);
    return window.forge.backend.onStatusChange(setBackendStatus);
  }, []);

  const toggleAutoStart = async () => {
    if (!backendConfig || !window.forge) return;
    setBackendConfig(await window.forge.backend.setConfig({ autoStart: !backendConfig.autoStart }));
  };

  const browseServerDir = async () => {
    if (!window.forge) return;
    const dir = await window.forge.backend.pickServerDir();
    if (!dir) return;
    setBackendConfig(await window.forge.backend.setConfig({ serverDir: dir }));
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Your preferences for this device</div>
        </div>
      </header>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-title">Account</div>
          </div>
          <div className="settings-card-body">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Signed in as</div>
                <div className="settings-row-value">{user?.email ?? '—'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-card-title">Appearance</div>
            <div className="settings-card-sub">
              Theme applies app-wide. System follows your OS preference live.
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Theme</div>
                <div className="settings-row-value">
                  {activeTheme?.label ?? themeId}
                  {activeTheme?.hint && (
                    <span className="muted"> · {activeTheme.hint}</span>
                  )}
                </div>
              </div>
              <ThemeSwitcher compact />
            </div>
          </div>
        </section>

        {window.forge && (
          <section className="settings-card">
            <div className="settings-card-head">
              <div className="settings-card-title">Backend</div>
              <div className="settings-card-sub">
                Neo4j and the extraction API run outside this app (see server/README.md) — autostart
                them here instead of running <span className="mono">docker compose up -d</span> and{' '}
                <span className="mono">uvicorn</span> by hand every time.
              </div>
            </div>
            <div className="settings-card-body">
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Autostart on launch</div>
                  <div className="settings-row-value">Starts Neo4j (Docker) and the FORGE API automatically</div>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={backendConfig?.autoStart ?? false}
                    onChange={toggleAutoStart}
                    disabled={!backendConfig}
                  />
                </label>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Server folder</div>
                  <div className="settings-row-value mono">{backendConfig?.serverDir ?? '—'}</div>
                </div>
                <button type="button" className="btn ghost small" onClick={browseServerDir}>
                  Browse…
                </button>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Status</div>
                  <div className="settings-row-value">
                    <span className={`pill${backendStatus?.state === 'error' ? ' error' : ''}`}>
                      {backendStatus ? STATE_LABELS[backendStatus.state] : '—'}
                    </span>
                    {backendStatus?.message && <span className="muted"> · {backendStatus.message}</span>}
                  </div>
                </div>
                <div className="row tight">
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => window.forge!.backend.retry().then(setBackendStatus)}
                    disabled={backendStatus?.state === 'starting'}
                  >
                    {backendStatus?.state === 'starting' ? 'Starting…' : 'Start'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => window.forge!.backend.stop().then(setBackendStatus)}
                    disabled={!backendStatus || backendStatus.state === 'idle' || backendStatus.state === 'starting'}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => window.forge!.backend.restart().then(setBackendStatus)}
                    disabled={!backendStatus || backendStatus.state === 'idle' || backendStatus.state === 'starting'}
                  >
                    Restart
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;
