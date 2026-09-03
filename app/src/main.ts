import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import * as backend from './backend-manager';
import type { BackendConfig } from './backend-manager';

// Squirrel hooks (Windows installer/uninstaller)
if (started) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#f5f5f7',
    // Fully frameless everywhere except macOS, which keeps its native
    // inset traffic lights (titleBarStyle: 'hiddenInset') since those are
    // the expected/native look there. Windows/Linux get no native chrome
    // at all — WindowControls.tsx draws minimize/maximize/close in the
    // topbar to match the rest of the UI, driven by IPC below. The
    // topbar's -webkit-app-region: drag (global.css) is what makes the
    // window still movable without a native titlebar.
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' }
      : { frame: false }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized-changed', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized-changed', false));
};

// Custom titlebar controls (Windows/Linux — see WindowControls.tsx). One
// handler per action, scoped to the window that sent it rather than a
// single global mainWindow reference, so this still behaves if more than
// one window is ever open.
ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.on('window:toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());
ipcMain.handle('window:is-maximized', (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false);

// Backend autostart (Settings screen) — see backend-manager.ts for the
// actual docker/uvicorn process handling.
ipcMain.handle('backend:get-config', () => backend.loadConfig());
ipcMain.handle('backend:set-config', (_event, patch: Partial<BackendConfig>) => {
  const next = { ...backend.loadConfig(), ...patch };
  backend.saveConfig(next);
  if (patch.autoStart === true) backend.startBackend();
  return next;
});
ipcMain.handle('backend:get-status', () => backend.getStatus());
ipcMain.handle('backend:retry', () => {
  backend.startBackend();
  return backend.getStatus();
});
ipcMain.handle('backend:stop', () => {
  backend.stopBackend();
  return backend.getStatus();
});
ipcMain.handle('backend:restart', () => {
  backend.restartBackend();
  return backend.getStatus();
});
ipcMain.handle('backend:pick-server-dir', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = win
    ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    : await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

app.on('ready', () => {
  createWindow();
  if (backend.loadConfig().autoStart) backend.startBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => backend.stopBackend());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
