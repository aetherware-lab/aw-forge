import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationKind = 'news' | 'success' | 'error';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

interface NotificationsState {
  notifications: AppNotification[];
  /** Dedupe keys already fired (e.g. `run:<id>:complete`, `news:<id>`) —
   * plain strings rather than a Set so this round-trips through JSON in
   * zustand's persist middleware. */
  seenKeys: string[];

  /** Adds a notification. Pass `dedupeKey` to fire it at most once ever
   * (checked against `seenKeys`) — e.g. one run-completion toast per run,
   * not one per poll tick. */
  add: (n: { kind: NotificationKind; title: string; body: string }, dedupeKey?: string) => void;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

let counter = 0;
const nextId = (): string => `notif-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/**
 * Tiny WAV data URIs synthesized at runtime — one sine-tone beep per kind.
 * ponytail: no audio-asset pipeline exists in this repo (see forge.env.d.ts
 * / vite config), so this generates a couple hundred bytes of PCM instead
 * of adding one. Swap for real .wav assets if these ever need to sound
 * like more than a beep.
 */
const TONES: Record<NotificationKind, number> = { success: 880, error: 220, news: 587 };
const soundCache = new Map<NotificationKind, string>();

function beepDataUri(freq: number, durationMs = 140): string {
  const sampleRate = 8000;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = 1 - i / numSamples; // fade out — avoids a click at cutoff
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.25;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function playSound(kind: NotificationKind): void {
  try {
    let uri = soundCache.get(kind);
    if (!uri) {
      uri = beepDataUri(TONES[kind]);
      soundCache.set(kind, uri);
    }
    void new Audio(uri).play().catch(() => {
      /* Autoplay can be blocked before the user has interacted with the
       * window — a silent toast is an acceptable fallback. */
    });
  } catch {
    /* Audio unavailable (e.g. a test/CI environment) — non-fatal. */
  }
}

/**
 * Native OS notification, but only when the window is unfocused — Electron
 * implements the Web Notification API natively in the renderer, so this
 * needs no main-process IPC (see main.ts / preload.ts, untouched).
 */
function maybeNotifyOs(title: string, body: string): void {
  if (typeof Notification === 'undefined' || typeof document === 'undefined') return;
  if (document.hasFocus()) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

/**
 * Notifications store. Mirrors the shape of store/solicitations.ts —
 * persisted so a run that finished (or a news item) already notified
 * doesn't re-fire after a reload, and the bell dropdown keeps its history
 * across sessions.
 */
export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      seenKeys: [],

      add: (n, dedupeKey) => {
        if (dedupeKey && get().seenKeys.includes(dedupeKey)) return;
        const notif: AppNotification = { ...n, id: nextId(), timestamp: Date.now(), read: false };
        set((s) => ({
          notifications: [notif, ...s.notifications].slice(0, 50),
          seenKeys: dedupeKey ? [...s.seenKeys, dedupeKey] : s.seenKeys,
        }));
        playSound(n.kind);
        maybeNotifyOs(n.title, n.body);
      },

      dismiss: (id) => set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) })),

      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)),
        })),

      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((x) => ({ ...x, read: true })) })),
    }),
    {
      name: 'forge-notifications',
      version: 1,
    },
  ),
);
