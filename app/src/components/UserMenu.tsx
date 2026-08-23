import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { IconLogOut, IconSettings } from '@/components/Icon';

/**
 * Avatar button in the topbar. Click opens a small dropdown with Settings
 * and Log out — closes on outside click, Escape, or navigation.
 */
const UserMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handle = user?.email?.split('@')[0] ?? 'Guest';
  const initials = handle.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user?.email ?? 'Account'}
      >
        <span aria-hidden="true">{initials}</span>
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-header">
            <div className="user-menu-name">{handle}</div>
            <div className="user-menu-email">{user?.email ?? ''}</div>
          </div>
          <NavLink
            to="/settings"
            className="user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <IconSettings size={15} /> Settings
          </NavLink>
          <button type="button" className="user-menu-item" role="menuitem" onClick={handleLogout}>
            <IconLogOut size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
