import React, { useEffect, useState } from 'react';
import { IconWindowMaximize, IconWindowMinimize, IconWindowRestore, IconX } from '@/components/Icon';

interface Props {
  /** Fixed top-right over the page instead of embedded inline — for
   * screens (Login) with no topbar of their own to sit inside. */
  floating?: boolean;
}

/**
 * Custom minimize/maximize/close buttons for the frameless window — see
 * `frame: false` in main.ts. macOS keeps its native inset traffic lights
 * (titleBarStyle: 'hiddenInset') and renders nothing here.
 */
const WindowControls: React.FC<Props> = ({ floating = false }) => {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!window.forge) return;
    window.forge.windowControls.isMaximized().then(setMaximized);
    return window.forge.windowControls.onMaximizedChange(setMaximized);
  }, []);

  // No native window to control in a browser tab, same as macOS's inset traffic lights.
  if (!window.forge || window.forge.platform === 'darwin') return null;

  const { minimize, toggleMaximize, close } = window.forge.windowControls;

  return (
    <div className={`window-controls${floating ? ' window-controls--floating' : ''}`}>
      <button type="button" className="window-control" aria-label="Minimize" onClick={minimize}>
        <IconWindowMinimize size={13} />
      </button>
      <button
        type="button"
        className="window-control"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        onClick={toggleMaximize}
      >
        {maximized ? <IconWindowRestore size={13} /> : <IconWindowMaximize size={13} />}
      </button>
      <button type="button" className="window-control close" aria-label="Close" onClick={close}>
        <IconX size={14} />
      </button>
    </div>
  );
};

export default WindowControls;
