import type { Analysis, CaptureSession, ChecklistItem, Dataset, Report } from './intelligence.ts';

export const LIVE_SESSION_LIMIT = 100;
export type LiveIntelligenceDataset = Dataset & {
  live: { totalSessions: number; loadedSessions: number; sessionLimit: number; truncated: boolean; fetchedAt: string };
};

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');
function invalid(part: string): never { throw new Error(`The backend returned invalid ${part}. Previous data has been retained.`); }
function object(value: unknown, part: string): RecordValue { return record(value) ? value : invalid(part); }

function sessionMetadata(value: unknown): CaptureSession {
  const s = object(value, 'session metadata');
  if (!id(s.id) || !date(s.startedAt) || (s.endedAt != null && !date(s.endedAt)) || !['active', 'ended'].includes(String(s.status))) invalid('session metadata');
  const revision = s.checklistRevision ?? 0;
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0) invalid('checklist revision');
  return { id: s.id as string, startedAt: s.startedAt as string, endedAt: s.endedAt as string | null ?? null,
    status: s.status as CaptureSession['status'], checklistRevision: revision };
}

function analysis(value: unknown): Analysis {
  const a = object(value, 'image assessment');
  if (typeof a.criterionKey !== 'string' || !a.criterionKey || typeof a.criterionName !== 'string' || typeof a.criterionVersion !== 'number'
    || !Number.isInteger(a.criterionVersion) || a.criterionVersion < 0 || typeof a.message !== 'string'
    || !['completed', 'unavailable'].includes(String(a.status)) || (a.status === 'completed' && !record(a.result))) invalid('image assessment');
  return { ...a } as Analysis;
}

function snapshotReport(value: unknown, sessionId: string): Report {
  const s = object(value, 'snapshot');
  if (!id(s.id) || s.sessionId !== sessionId || !date(s.time)) invalid('snapshot metadata');
  let position: Report['position'] = null;
  if (s.location != null) {
    const p = object(s.location, 'snapshot location');
    if (typeof p.latitude !== 'number' || !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90
      || typeof p.longitude !== 'number' || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180) invalid('snapshot location');
    // These coordinates came from the backend read endpoint, not a client permission override.
    position = { latitude: p.latitude, longitude: p.longitude, authorized: true };
  }
  if (s.direction != null && (typeof s.direction !== 'number' || !Number.isFinite(s.direction) || s.direction < 0 || s.direction >= 360)) invalid('snapshot direction');
  if (s.analyses != null && !Array.isArray(s.analyses)) invalid('image assessments');
  if (s.analyzedAt != null && !date(s.analyzedAt)) invalid('analysis time');
  if (s.analysisMessage != null && typeof s.analysisMessage !== 'string') invalid('analysis message');
  if (s.receivedAt != null && !date(s.receivedAt)) invalid('receipt time');
  if (s.followUp != null && !record(s.followUp)) invalid('follow-up');
  if (s.captureQuality != null && !record(s.captureQuality)) invalid('capture quality');
  return {
    id: s.id as string, title: `Capture ${(s.id as string).slice(-8)}`,
    description: typeof s.analysisMessage === 'string' ? s.analysisMessage : `Witness capture from session ${sessionId}.`,
    area: null, receivedAt: s.receivedAt as string | null ?? null, observedAt: s.time as string, review: null, position, claims: [],
    snapshot: { sessionId, direction: s.direction as number | null ?? null,
      // Never trust an upstream URL to send private media requests to another origin.
      imageUrl: `/api/backend/snapshots/${s.id}/image`,
      analyses: Array.isArray(s.analyses) ? s.analyses.map(analysis) : null,
      analyzedAt: s.analyzedAt as string | null ?? null, analysisMessage: s.analysisMessage as string | null ?? null,
      followUp: s.followUp as RecordValue | null ?? null, captureQuality: s.captureQuality as RecordValue | null ?? null },
  };
}

function checklist(value: unknown, reportIds: Set<string>): NonNullable<CaptureSession['checklist']> {
  const c = object(value, 'session checklist');
  const belongs = (value: unknown): value is string => typeof value === 'string' && reportIds.has(value);
  if (!['complete', 'incomplete'].includes(String(c.verificationStatus)) || !Array.isArray(c.snapshotIds) || !c.snapshotIds.every(belongs)
    || (c.latestSnapshotId !== null && !belongs(c.latestSnapshotId)) || !Array.isArray(c.items) || !Array.isArray(c.gaps) || typeof c.summary !== 'string') invalid('checklist sources');
  const keys = new Set<string>();
  const items = c.items.map(value => {
    const i = object(value, 'checklist item');
    if (typeof i.criterionKey !== 'string' || keys.has(i.criterionKey) || typeof i.criterionName !== 'string'
      || !['session', 'current_snapshot'].includes(String(i.scope)) || !['resolved', 'uncertain', 'unavailable'].includes(String(i.status))
      || !record(i.known) || !strings(i.unresolvedFields) || !Array.isArray(i.unavailableSnapshotIds) || !i.unavailableSnapshotIds.every(belongs)
      || !Array.isArray(i.observations)) invalid('checklist item');
    keys.add(i.criterionKey as string);
    const source = (v: unknown) => record(v) && 'value' in v && belongs(v.snapshotId) && (v.capturedAt === null || date(v.capturedAt));
    for (const v of Object.values(i.known as RecordValue)) {
      if (!source(v) || (record(v) && v.sources !== undefined && (!Array.isArray(v.sources) || !v.sources.every(source)))) invalid('evidence source');
    }
    for (const v of i.observations as unknown[]) {
      if (!record(v) || !belongs(v.snapshotId) || typeof v.criterionVersion !== 'number' || !Number.isInteger(v.criterionVersion) || !record(v.result)) invalid('evidence observation');
    }
    return { ...i } as ChecklistItem;
  });
  for (const g of c.gaps) if (!record(g) || typeof g.id !== 'string' || typeof g.criterionKey !== 'string' || typeof g.field !== 'string' || typeof g.priority !== 'number' || !Number.isFinite(g.priority)) invalid('checklist gaps');
  return { ...c, items } as NonNullable<CaptureSession['checklist']>;
}

export function mapLiveSession(sessionValue: unknown, snapshotsValue: unknown): { session: CaptureSession; reports: Report[] } {
  const raw = object(sessionValue, 'session');
  const session = sessionMetadata(raw);
  if (!Array.isArray(snapshotsValue)) invalid('snapshot list');
  const reports = snapshotsValue.map(value => snapshotReport(value, session.id));
  const reportIds = new Set(reports.map(r => r.id));
  if (reportIds.size !== reports.length) invalid('duplicate snapshot IDs');
  if (raw.checklist != null) session.checklist = checklist(raw.checklist, reportIds);
  if (raw.instruction != null) {
    const instruction = object(raw.instruction, 'instruction');
    if (!['ready', 'not_needed', 'unavailable'].includes(String(instruction.status))) invalid('instruction status');
    for (const field of ['witnessMessage', 'reason', 'gapId']) if (instruction[field] != null && typeof instruction[field] !== 'string') invalid('instruction');
    if (instruction.checklistRevision != null && (typeof instruction.checklistRevision !== 'number' || !Number.isInteger(instruction.checklistRevision))) invalid('instruction revision');
    session.instruction = { ...instruction } as CaptureSession['instruction'];
  }
  return { session, reports };
}

async function read(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/backend/${path}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Live session data could not be loaded (HTTP ${response.status}).`);
  const body: unknown = await response.json();
  if (!record(body) || !('data' in body)) invalid('response envelope');
  return body.data;
}

export async function fetchLiveIntelligence(signal?: AbortSignal, sessionLimit = LIVE_SESSION_LIMIT): Promise<LiveIntelligenceDataset> {
  if (!Number.isInteger(sessionLimit) || sessionLimit < 1) throw new Error('The session limit must be a positive integer.');
  const failure = new AbortController();
  const timeout = AbortSignal.timeout(45000);
  const requestSignal = AbortSignal.any([failure.signal, timeout, ...(signal ? [signal] : [])]);
  const list = await read('sessions', requestSignal);
  if (!Array.isArray(list)) invalid('session list');
  const sessions = list.map(sessionMetadata).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.id.localeCompare(a.id));
  if (new Set(sessions.map(s => s.id)).size !== sessions.length) invalid('duplicate session IDs');
  const selected = sessions.slice(0, sessionLimit);
  const results = new Array<ReturnType<typeof mapLiveSession>>(selected.length);
  let nextIndex = 0;
  // Limit parallel requests; read snapshots after metadata so newly added checklist sources exist.
  try { await Promise.all(Array.from({ length: Math.min(4, selected.length) }, async () => {
    while (nextIndex < selected.length) {
      requestSignal.throwIfAborted();
      const index = nextIndex++;
      const expected = selected[index];
      const raw = await read(`sessions/${expected.id}`, requestSignal);
      if (!record(raw) || raw.id !== expected.id) invalid('session identity');
      const snapshots = await read(`sessions/${expected.id}/snapshots`, requestSignal);
      try { results[index] = mapLiveSession(raw, snapshots); }
      catch (error) {
        // Separate endpoints are not an atomic database snapshot. Retry missing evidence once.
        if (!(error instanceof Error) || !/invalid (checklist sources|evidence source|evidence observation)/.test(error.message)) throw error;
        const latest = await read(`sessions/${expected.id}`, requestSignal);
        if (!record(latest) || latest.id !== expected.id) invalid('session identity');
        results[index] = mapLiveSession(latest, await read(`sessions/${expected.id}/snapshots`, requestSignal));
      }
    }
  })); } catch (error) { failure.abort(); throw error; }
  requestSignal.throwIfAborted();
  const reports = results.flatMap(result => result.reports);
  if (new Set(reports.map(r => r.id)).size !== reports.length) invalid('duplicate snapshot IDs');
  const fetchedAt = new Date().toISOString();
  return { demo: false, referenceTime: fetchedAt, reports, incidents: [], sessions: results.map(result => result.session),
    live: { totalSessions: sessions.length, loadedSessions: selected.length, sessionLimit,
      truncated: sessions.length > selected.length, fetchedAt } };
}
