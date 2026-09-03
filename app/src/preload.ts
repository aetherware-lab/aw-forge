// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { BackendConfig, BackendStatus } from './backend-manager';

// Renderer has no Node `process` (contextIsolation + nodeIntegration: false)
// but needs to know the OS: macOS keeps its native inset traffic lights,
// Windows/Linux render nothing native (frame: false in main.ts) and need
// WindowControls.tsx's custom buttons instead.
contextBridge.exposeInMainWorld('forge', {
  platform: process.platform,
  windowControls: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
    onMaximizedChange: (callback: (maximized: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
      ipcRenderer.on('window:maximized-changed', listener);
      return () => ipcRenderer.removeListener('window:maximized-changed', listener);
    },
  },
  backend: {
    getConfig: () => ipcRenderer.invoke('backend:get-config') as Promise<BackendConfig>,
    setConfig: (patch: Partial<BackendConfig>) => ipcRenderer.invoke('backend:set-config', patch) as Promise<BackendConfig>,
    getStatus: () => ipcRenderer.invoke('backend:get-status') as Promise<BackendStatus>,
    retry: () => ipcRenderer.invoke('backend:retry') as Promise<BackendStatus>,
    stop: () => ipcRenderer.invoke('backend:stop') as Promise<BackendStatus>,
    restart: () => ipcRenderer.invoke('backend:restart') as Promise<BackendStatus>,
    pickServerDir: () => ipcRenderer.invoke('backend:pick-server-dir') as Promise<string | null>,
    onStatusChange: (callback: (status: BackendStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: BackendStatus) => callback(status);
      ipcRenderer.on('backend:status-changed', listener);
      return () => ipcRenderer.removeListener('backend:status-changed', listener);
    },
  },
});
