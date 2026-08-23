import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import UserMenu from './UserMenu';
import { IconClipboard, IconLayers } from '@/components/Icon';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ size?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/solicitations', label: 'Solicitations', icon: IconClipboard },
  { to: '/extraction-runs', label: 'Extraction Runs', icon: IconLayers },
];

const JUST_LOGGED_IN_KEY = 'forge-just-logged-in';

/**
 * Outer chrome that wraps every authenticated route: a single topbar
 * (brand + primary nav + user menu) over a floating content card. There
 * is no sidebar — everything lives in this one bar.
 *
 * If Login just navigated here, `app-enter` plays a one-time fade-in of
 * the whole shell (see Login.tsx for the fade-out/expand half of the
 * transition — it expands the sign-in card into roughly this same
 * floating-card shape, see `.app-card` in global.css). The sessionStorage
 * flag is consumed immediately so back navigation or a refresh never
 * replays it.
 */
const AppShell: React.FC = () => {
  const [justEntered] = useState(() => {
    try {
      if (sessionStorage.getItem(JUST_LOGGED_IN_KEY)) {
        sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
        return true;
      }
    } catch {
      /* sessionStorage unavailable — skip the entrance animation */
    }
    return false;
  });

  return (
    <div className={`app-shell${justEntered ? ' app-enter' : ''}`}>
      <div className="chrome-bar topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <span className="topbar-brand-mark" aria-hidden="true">F</span>
            <span className="topbar-brand-name">FORGE</span>
          </div>
          <nav className="topbar-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}
              >
                <span className="topbar-link-icon" aria-hidden="true">
                  <item.icon size={15} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-right chrome-right">
          <UserMenu />
        </div>
      </div>
      <main className="app-main bg-grid">
        <div className="app-card">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppShell;
