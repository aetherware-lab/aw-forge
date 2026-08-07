# FORGE — Desktop Frontend

**FORGE** (Federal Opportunity Requirement GEnerator) — GraphRAG requirement-extraction review UI, built on Electron Forge + Vite + React + TypeScript. No backend yet — screens read from `src/fixtures/` and persist nothing beyond `localStorage`. See `../260807 forge-design-document.md` for the target architecture and product scope.

## Run it

```powershell
cd app
npm install
npm start
```

The first install pulls Electron (~100 MB). Subsequent starts are fast.

## What's built

- **Login** (`/login`) — stub auth; any email signs in. Session persists via `localStorage`.
- **Solicitations** (`/solicitations`) — tracked solicitations as cards, with search, agency/tag filters, and sort.
- **New / Edit Solicitation** — form with SAM.gov URL field, tags, drag-drop document upload (UI only).
- **Solicitation Page** — document library (source docs + extraction runs) and a SAM.gov news panel; **New Extraction Run** overlay.
- **Citations Table** — one row per extracted requirement: type pill, confidence bar, tiered review flags, citation links. This is FORGE's terminal screen — see the design document, §2 and §6.7, for why there's no further generation step downstream of it.
- **Citation Drawer** — source snippet + Open-in-PDF stub, opened from a citation link.
- **Export Modal** — format + field selection; downloads a JSON preview of the payload for now.
- **Settings** — theme switcher.

No backend: all of the above reads from `src/fixtures/` and writes only to `localStorage` (via Zustand `persist`).

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
    Sidebar.tsx
    SolicitationCard.tsx
    NewExtractionRunModal.tsx
    CitationDrawer.tsx
    ExportModal.tsx
  screens/
    Login.tsx
    Dashboard.tsx         Solicitations index
    NewSolicitation.tsx / EditSolicitation.tsx / SolicitationForm.tsx
    SolicitationPage.tsx
    CitationsTable.tsx
    Settings.tsx
  store/
    auth.ts / ui.ts / theme.ts / solicitations.ts   Zustand + persist
  fixtures/
    solicitations.ts / documents.ts / news.ts / requirements-sample.ts
  types/
    index.ts          Solicitation / Requirement / Citation / ExtractionRun
  styles/
    tokens.css        CSS variables ported from qmat-wireframes-v6-final.html
    global.css        Base + primitives (.btn, .pill, .tag-pill, .sol-card, etc.)
```

> **Naming note:** the design document's Aug 2026 scope change retired "QMat"/"CMat" as FORGE concepts — FORGE now extracts requirements only; matrix generation belongs to a separate downstream project. The frontend vocabulary has been realigned to match: the modal is `NewExtractionRunModal`, the `DocumentType` value is `'Extraction Run'` (no more `'CMat'`), and the route is `/extraction/:runId/citations`. `qmat-wireframes-v6-final.html` (the original static mockup this UI was built from) still predates the rename and is left as-is for reference.

## What's next

The biggest gap is that none of this talks to a real backend. Per the design document, that means a Python cloud server (docling-serve + LangGraph + Neo4j) that the Electron app calls over HTTP — no local Python, no local database. See the design document's Open Questions (§12) for the decisions that need to be made before that server can be built.

## Note on the `renderer.ts` stub

The Forge template shipped a `renderer.ts` file. It's superseded by `renderer.tsx`. The empty stub stays because the workspace folder permissions wouldn't let me delete it — feel free to remove it on your end.
