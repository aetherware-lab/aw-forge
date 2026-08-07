# CMat Generator — Desktop Frontend

Compliance Matrix Generator UI, built on Electron Forge + Vite + React + TypeScript. No backend yet — screens read from `src/fixtures/` and persist nothing beyond `localStorage`.

## Run it

```powershell
cd app
npm install
npm start
```

The first install pulls Electron (~100 MB). Subsequent starts are fast.

## What's built (vertical slice 1)

- **Login** (`/login`) — stub auth; any email signs in. Session persists via `localStorage`.
- **Dashboard** (`/dashboard`) — five seeded solicitations from the wireframe. Working search, agency filter, tag filter, and sort (response date / progress / title).
- **Other screens** — routed but stubbed with a `Placeholder` component. Click a solicitation card or "+ New Solicitation" to confirm routing works.

## Layout

```
src/
  renderer.tsx        Entry — mounts <App /> in HashRouter
  App.tsx             Route table
  main.ts             Electron main process
  preload.ts          (default) — IPC bridge will land here
  components/
    AppShell.tsx      Chrome bar + outlet for authed routes
    RequireAuth.tsx   Route guard
    SolicitationCard.tsx
  screens/
    Login.tsx
    Dashboard.tsx
    Placeholder.tsx   Stub for unbuilt screens
  store/
    auth.ts           Zustand + persist
  fixtures/
    solicitations.ts  Seed data from the wireframe
  types/
    index.ts          Solicitation / Requirement / Citation / QMat / Question
  styles/
    tokens.css        CSS variables ported from qmat-wireframes-v6-final.html
    global.css        Base + primitives (.btn, .pill, .tag-pill, .sol-card, etc.)
```

## What's next (vertical slice 2 → full mockup)

In rough order:

1. **New Solicitation** form (Screen 3) — controlled form, drag-drop file inputs (UI only).
2. **Solicitation Page** (Screen 4) — two-pane layout with library + news panels.
3. **New QMat overlay** (Overlay A) — modal mounted over Screen 4.
4. **Citations Table** (Screen 5) — the requirements table with type pills, confidence bars, tiered flags.
5. **Citation Drawer** (Overlay B) — side panel with requirement detail + citations.
6. **Questions Form** (Screen 6) — MCQ cards keyed off flagged requirements.
7. **Export Modal** (Overlay C) — compact centered modal.

Then: replace fixtures with a real backend (Python sidecar talking GraphRAG over IPC), wire export to produce the prospect-facing form (probably web-hosted, not Electron).

## Note on the `renderer.ts` stub

The Forge template shipped a `renderer.ts` file. It's superseded by `renderer.tsx`. The empty stub stays because the workspace folder permissions wouldn't let me delete it — feel free to remove it on your end.
