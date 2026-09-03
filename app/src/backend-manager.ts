/**
 * Starts/monitors the FORGE backend (Neo4j via Docker Compose + the
 * uvicorn API process) from Electron's main process. Both are plain OS
 * processes outside Electron — Node can spawn them, but nothing here runs
 * in-process (Electron has no Python runtime), so "autostart" means
 * shelling out and watching what comes back.
 *
 * Used by main.ts, which wires this to IPC and the app lifecycle.
 */
import { app, BrowserWindow } from 'electron';
import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export interface BackendConfig {
  autoStart: boolean;
  serverDir: string;
}

export type BackendState = 'idle' | 'starting' | 'running' | 'error';
export interface BackendStatus {
  state: BackendState;
  message: string;
}

const CONFIG_PATH = path.join(app.getPath('userData'), 'backend-config.json');
const HEALTH_URL = 'http://localhost:8000/health';

// Dev layout: <repo>/app and <repo>/server are siblings — app.getAppPath()
// resolves to <repo>/app here. There's no packaged build of the server
// yet (see server/README.md — "no deployment story"), so this guess only
// has to hold for this local, single-machine setup; Settings lets it be
// corrected if it's ever wrong.
const defaultServerDir = (): string => path.join(path.dirname(app.getAppPath()), 'server');

let status: BackendStatus = { state: 'idle', message: 'Not started.' };
let uvicornProcess: ChildProcess | null = null;
let uvicornExit: { code: number | null; stderr: string } | null = null;
let startInFlight = false;

function setStatus(next: BackendStatus): void {
  status = next;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('backend:status-changed', status);
  }
}

export function getStatus(): BackendStatus {
  return status;
}

export function loadConfig(): BackendConfig {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return {
      autoStart: Boolean(parsed.autoStart),
      serverDir: typeof parsed.serverDir === 'string' && parsed.serverDir ? parsed.serverDir : defaultServerDir(),
    };
  } catch {
    return { autoStart: false, serverDir: defaultServerDir() };
  }
}

export function saveConfig(config: BackendConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/** Runs a short-lived command (docker checks, `docker compose up -d`) and
 * collects its output instead of letting it run forever — a hung or
 * resource-starved Docker Desktop should surface as an error, not a
 * silently stuck toggle. */
function runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawn(command, args, { cwd, shell: true });
    } catch (err) {
      resolve({ ok: false, output: err instanceof Error ? err.message : String(err) });
      return;
    }
    let output = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, output: `${output}\n(timed out after ${Math.round(timeoutMs / 1000)}s)` });
    }, timeoutMs);
    child.stdout?.on('data', (d) => { output += d.toString(); });
    child.stderr?.on('data', (d) => { output += d.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, output: err.message });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: output.trim() || (code === 0 ? '' : `exited with code ${code}`) });
    });
  });
}

function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Polls /health until it responds, the uvicorn process dies, or time
 * runs out — whichever happens first, so a crashed process doesn't just
 * sit there timing out for the full window. */
async function waitForHealthy(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (uvicornExit) return false;
    if (await checkHealth()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function spawnUvicorn(serverDir: string): { ok: boolean; error?: string } {
  const uvicornBin = path.join(serverDir, '.venv', 'Scripts', 'uvicorn.exe');
  if (!fs.existsSync(uvicornBin)) {
    return {
      ok: false,
      error: `Python environment not found at "${uvicornBin}". Run "pip install -r requirements.txt" in ${serverDir} first — see server/README.md.`,
    };
  }

  uvicornExit = null;
  const child = spawn(uvicornBin, ['app.main:app', '--port', '8000'], { cwd: serverDir });
  uvicornProcess = child;

  let stderr = '';
  child.stderr?.on('data', (d) => {
    stderr += d.toString();
  });
  // uvicorn's access log writes one line per request to stdout. Node's pipe
  // for it has a small OS buffer (~64KB) — with no reader, that buffer fills
  // after enough requests and the child's next write() blocks forever,
  // freezing the whole process (it hangs mid-write while holding Python's
  // logging lock, so even unrelated requests stop getting logged/served).
  // Nothing here needs the output, so just drain and discard it.
  child.stdout?.on('data', () => {});
  child.on('exit', (code) => {
    uvicornExit = { code, stderr };
    if (uvicornProcess === child) uvicornProcess = null;
  });

  return { ok: true };
}

/** Returns true once the FORGE API is confirmed not running — either this
 * app's own uvicorn child was killed, or nothing was listening to begin
 * with. Returns false if something is answering on :8000 that this app
 * didn't spawn (e.g. uvicorn started by hand in a terminal) — Electron has
 * no handle to that process, so it can't be stopped from here.
 *
 * Neo4j is left running either way — it's meant to persist across sessions
 * (see server/README.md), same as if the user had started it by hand. */
export async function stopBackend(): Promise<boolean> {
  if (uvicornProcess) {
    uvicornProcess.kill();
    uvicornProcess = null;
    setStatus({ state: 'idle', message: 'Stopped.' });
    return true;
  }
  if (await checkHealth()) {
    setStatus({
      state: 'error',
      message:
        "The FORGE server is running but wasn't started from this app, so it can't be stopped here — " +
        'close it from wherever it was started (e.g. its terminal window), then use Start.',
    });
    return false;
  }
  setStatus({ state: 'idle', message: 'Not running.' });
  return true;
}

export async function restartBackend(): Promise<void> {
  const stopped = await stopBackend();
  if (!stopped) return;
  await startBackend();
}

export async function startBackend(): Promise<void> {
  if (startInFlight) return;
  startInFlight = true;
  try {
    const config = loadConfig();
    const serverDir = config.serverDir;

    if (!fs.existsSync(serverDir)) {
      setStatus({ state: 'error', message: `FORGE server folder not found at "${serverDir}". Set the correct path in Settings.` });
      return;
    }

    setStatus({ state: 'starting', message: 'Checking Docker…' });
    const dockerCheck = await runCommand('docker', ['info'], serverDir, 10_000);
    if (!dockerCheck.ok) {
      setStatus({
        state: 'error',
        message: "Docker isn't installed or isn't running. Start Docker Desktop, or turn off autostart and run the backend manually.",
      });
      return;
    }

    setStatus({ state: 'starting', message: 'Starting Neo4j (docker compose up -d)…' });
    const compose = await runCommand('docker', ['compose', 'up', '-d'], serverDir, 120_000);
    if (!compose.ok) {
      setStatus({
        state: 'error',
        message: `Neo4j failed to start — often a sign Docker doesn't have enough memory/CPU available. ${compose.output.slice(-400)}`,
      });
      return;
    }

    // Something may already be serving :8000 — the user's own manually-
    // started uvicorn, or one we spawned on a previous startBackend() call.
    // Spawning another would just fail on a port conflict.
    if (!uvicornProcess && !(await checkHealth())) {
      setStatus({ state: 'starting', message: 'Starting the FORGE server…' });
      const spawned = spawnUvicorn(serverDir);
      if (!spawned.ok) {
        setStatus({ state: 'error', message: spawned.error! });
        return;
      }
    }

    setStatus({ state: 'starting', message: 'Waiting for the FORGE server to respond…' });
    const healthy = await waitForHealthy(45_000);
    if (!healthy) {
      const reason = uvicornExit
        ? `The FORGE server process exited unexpectedly. ${uvicornExit.stderr.slice(-500) || `Exit code ${uvicornExit.code}.`}`
        : 'The FORGE server started but did not respond on :8000 within 45s.';
      setStatus({ state: 'error', message: reason });
      return;
    }

    setStatus({ state: 'running', message: 'FORGE server is running.' });
  } finally {
    startInFlight = false;
  }
}
