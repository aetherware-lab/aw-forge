import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface NavSection {
  /** Section heading. Hidden when sidebar is collapsed. */
  label: string;
  items: NavItem[];
}

/**
 * Primary navigation grouped by intent.
 *
 * Adding a new destination: push a row into the right section. NavLink
 * handles active-state styling automatically.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { to: '/solicitations', label: 'Solicitations', icon: '📋' },
    ],
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useUi((s) => s.toggleSidebar);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handle = user?.email?.split('@')[0] ?? 'Guest';
  const initials = handle.slice(0, 2).toUpperCase();

  return (
    <aside
      className={`sidebar${collapsed ? ' collapsed' : ''}`}
      aria-label="Primary"
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true">C</div>
        <div className="sidebar-brand-name">FORGE</div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-cta">
        <button
          type="button"
          className="btn full"
          onClick={() => navigate('/solicitations/new')}
          title={collapsed ? '+ New Solicitation' : undefined}
        >
          <span className="sidebar-link-icon" aria-hidden="true">＋</span>
          <span className="sidebar-link-label">New Solicitation</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user" title={collapsed ? user?.email : undefined}>
          <div className="sidebar-user-avatar" aria-hidden="true">{initials}</div>
          <div className="sidebar-user-meta sidebar-link-label">
            <div className="sidebar-user-name">{handle}</div>
            <div className="sidebar-user-email">{user?.email ?? ''}</div>
          </div>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link sidebar-link-quiet${isActive ? ' active' : ''}`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <span className="sidebar-link-icon" aria-hidden="true">⚙️</span>
          <span className="sidebar-link-label">Settings</span>
        </NavLink>
        <button
          type="button"
          className="sidebar-link sidebar-link-quiet sidebar-link-button"
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
        >
          <span className="sidebar-link-icon" aria-hidden="true">⎋</span>
          <span className="sidebar-link-label">Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
