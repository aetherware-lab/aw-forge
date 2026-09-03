import type { Requirement } from '@/types';

const BASE_URL = 'http://localhost:8000';

class ApiError extends Error {}

/** fetch() throws a bare `TypeError: Failed to fetch` when the server is
 * unreachable — that raw message was leaking straight into the UI (see
 * every screen's `err instanceof Error ? err.message : ...` fallback,
 * which never triggers for it since TypeError IS an Error). Route every
 * call through here so that case gets a message someone can act on. */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError(`Could not reach the FORGE server at ${BASE_URL} — is it running?`);
  }
}

export interface RunDoc {
  docId: string;
  filename: string;
}

export interface CreateExtractionRunPayload {
  solicitation: { number: string; title: string; agency: string };
  name: string;
  docs: RunDoc[];
  files: File[];
}

export type RunStatus = 'pending' | 'running' | 'complete' | 'error';

export interface ExtractionRunStatus {
  id: string;
  name: string;
  status: RunStatus;
  error: string | null;
  createdAt: string;
  /** Set once status is 'complete' or 'error'; null while still in flight. */
  completedAt: string | null;
  solicitationNumber: string;
  solicitationTitle: string;
  solicitationAgency: string;
  requirementCount: number;
  /** Live chunk count for the run — same "count what's actually in Neo4j
   * right now" approach as requirementCount above, so the Parsing stage can
   * show real chunks-created-so-far. */
  chunkCount: number;
  /** Live pipeline progress — see server/app/pipeline.py. `stage` is one of
   * 'parsing' | 'extracting' | 'validating' | 'generating'; null before the
   * pipeline starts. */
  stage: string | null;
  stageCurrent: number;
  stageTotal: number;
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function createExtractionRun(
  payload: CreateExtractionRunPayload,
): Promise<{ id: string; status: RunStatus }> {
  const form = new FormData();
  form.append(
    'metadata',
    JSON.stringify({ solicitation: payload.solicitation, name: payload.name, docs: payload.docs }),
  );
  payload.files.forEach((file) => form.append('files', file, file.name));

  const res = await apiFetch(`${BASE_URL}/extraction-runs`, { method: 'POST', body: form });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res));
  return res.json();
}

export interface UploadedDocument {
  docId: string;
  filename: string;
  sizeBytes: number;
}

/**
 * Persists documents to the FORGE server independent of any extraction run,
 * so they can be reused across runs (and re-runs) instead of re-uploaded
 * every time.
 */
export async function uploadDocuments(files: File[]): Promise<UploadedDocument[]> {
  const form = new FormData();
  files.forEach((file) => form.append('files', file, file.name));

  const res = await apiFetch(`${BASE_URL}/documents`, { method: 'POST', body: form });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res));
  return res.json();
}

export async function getExtractionRunStatus(runId: string): Promise<ExtractionRunStatus> {
  const res = await apiFetch(`${BASE_URL}/extraction-runs/${runId}`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res));
  return res.json();
}

/**
 * Every run the server knows about, regardless of how it was created — the
 * app has no local record of runs made via a direct API call (curl, a
 * script, etc.), so this is the only way to discover them from inside FORGE.
 */
export async function listExtractionRuns(): Promise<ExtractionRunStatus[]> {
  const res = await apiFetch(`${BASE_URL}/extraction-runs`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res));
  return res.json();
}

export async function getExtractionRunRequirements(runId: string): Promise<Requirement[]> {
  const res = await apiFetch(`${BASE_URL}/extraction-runs/${runId}/requirements`);
  if (!res.ok) throw new ApiError(await parseErrorDetail(res));
  return res.json();
}
