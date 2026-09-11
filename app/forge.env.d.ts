/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

interface BackendConfig {
  autoStart: boolean;
  serverDir: string;
}
interface BackendStatus {
  state: 'idle' | 'starting' | 'running' | 'error';
  message: string;
}

interface Window {
  forge?: {
    platform: NodeJS.Platform;
    windowControls: {
      minimize: () => void;
      toggleMaximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
    };
    backend: {
      getConfig: () => Promise<BackendConfig>;
      setConfig: (patch: Partial<BackendConfig>) => Promise<BackendConfig>;
      getStatus: () => Promise<BackendStatus>;
      retry: () => Promise<BackendStatus>;
      stop: () => Promise<BackendStatus>;
      restart: () => Promise<BackendStatus>;
      pickServerDir: () => Promise<string | null>;
      onStatusChange: (callback: (status: BackendStatus) => void) => () => void;
    };
  };
}
