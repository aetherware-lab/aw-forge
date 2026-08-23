# FORGE — Desktop Frontend

**FORGE** (Federal Opportunity Requirement GEnerator) — GraphRAG requirement-extraction review UI, built on Electron Forge + Vite + React + TypeScript. It's a thin client: solicitation/document metadata lives in `localStorage` (via Zustand `persist`), but document content, extraction runs, and citations are all served by the FORGE server (`../server/`) over HTTP. See `../260807 forge-design-document.md` for the target architecture and product scope, and `../server/README.md` to run the server this app depends on.

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
- **New / Edit Solicitation** — form with SAM.gov URL field, tags, drag-drop document upload — files are uploaded to the FORGE server (`POST /documents`) and stored for reuse across extraction runs.
- **Solicitation Page** — document library (source docs + extraction runs) and a SAM.gov news panel; **+ Upload Document** to add more source docs later, **+ New Extraction Run** to run the pipeline against selected library docs and/or freshly dropped files.
- **Citations Table** — one row per extracted requirement: type pill, confidence bar, tiered review flags, citation links. Polls the server for run status and renders real requirements/citations once a run completes. This is FORGE's terminal screen — see the design document, §2 and §6.7, for why there's no further generation step downstream of it.
- **Citation Drawer** — source snippet + Open-in-PDF stub, opened from a citation link.
- **Export Modal** — format + field selection; downloads a JSON preview of the payload for now.
- **Settings** — theme switcher.

Solicitation/document *metadata* lives in `localStorage` (via Zustand `persist`); document *content*, extraction runs, and citations live on the FORGE server and are fetched over HTTP (`src/lib/api.ts`).

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

The FORGE server (`../server/`) — docling-serve + LangGraph + Neo4j, called over HTTP with no local Python or database in Electron — is built and wired up for real extraction runs. Remaining gaps: SAM.gov sync is UI-only (no backend), export is a JSON-preview stub rather than real xlsx/csv/docx, and "Open in PDF" in the Citation Drawer is a stub. See the design document's Open Questions (§12) for what's still undecided about export scope.

## Note on the `renderer.ts` stub

The Forge template shipped a `renderer.ts` file. It's superseded by `renderer.tsx`. The empty stub stays because the workspace folder permissions wouldn't let me delete it — feel free to remove it on your end.
