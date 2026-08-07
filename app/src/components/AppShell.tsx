import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useUi } from '@/store/ui';

interface AppShellProps {
  /** Workspace label on the left of the chrome bar */
  crumbs?: string;
}

/**
 * Outer chrome that wraps every authenticated route.
 *
 * Layout:
 *   chrome-bar (draggable, slim)
 *   ───────────────────────────
 *   sidebar │ main content
 *
 * The .app-body grid column-width is driven by data-sidebar so the layout
 * tracks the collapse state in CSS only — no JS-driven measurements.
 */
const AppShell: React.FC<AppShellProps> = ({ crumbs = 'WSGC Workspace' }) => {
  const collapsed = useUi((s) => s.sidebarCollapsed);

  return (
    <div className="app-shell" data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
      <div className="chrome-bar">
        <span>{crumbs}</span>
        <span aria-hidden="true">·</span>
      </div>
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
