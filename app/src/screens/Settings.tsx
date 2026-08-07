import React from 'react';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useAuth } from '@/store/auth';
import { THEMES } from '@/themes';
import { useTheme } from '@/store/theme';

/**
 * User settings. Theme picker lives here; future sections (profile,
 * keyboard shortcuts, default tags, integrations) drop into this same
 * scaffold without changing routing.
 */
const Settings: React.FC = () => {
  const user = useAuth((s) => s.user);
  const themeId = useTheme((s) => s.themeId);
  const activeTheme = THEMES.find((t) => t.id === themeId);

  return (
    <>
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
            <div className="settings-card-sub">
              Stub auth — real account management lands with the backend.
            </div>
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
      </div>
    </>
  );
};

export default Settings;
