export type Claim = { subject: 'Smoke' | 'Fire presence' | 'Source location'; assessment: 'Reported' | 'Unresolved' | 'Not reported'; source: string };
export type Report = {
  id: string; title: string; description: string; area: string | null;
  receivedAt: string | null; observedAt: string | null; review: string | null;
  position: { latitude: number; longitude: number; authorized: boolean } | null;
  claims: Claim[];
  snapshot?: SnapshotEvidence;
};
export type Analysis = {
  criterionKey: string; criterionName: string; criterionVersion: number;
  status: 'completed' | 'unavailable'; message: string; result?: Record<string, unknown>;
};
export type SnapshotEvidence = {
  sessionId: string; direction: number | null; imageUrl: string | null;
  analyses: Analysis[] | null; analyzedAt: string | null; analysisMessage: string | null;
  followUp: Record<string, unknown> | null; captureQuality?: Record<string, unknown> | null;
};
export type ChecklistItem = {
  criterionKey: string; criterionName: string; scope: string;
  status: 'resolved' | 'uncertain' | 'unavailable';
  known: Record<string, { value: unknown; snapshotId: string; capturedAt: string | null;
    sources?: { value: unknown; snapshotId: string; capturedAt: string | null }[] }>;
  unresolvedFields: string[]; unavailableSnapshotIds: string[];
  observations: { snapshotId: string; criterionVersion: number; result: Record<string, unknown>; capturedAt?: string | null; captureAssessment?: Record<string, unknown>; qualityUnavailable?: boolean }[];
};
export type CaptureSession = {
  id: string; startedAt: string; endedAt: string | null; status: 'active' | 'ended'; checklistRevision: number;
  checklist?: { verificationStatus: 'complete' | 'incomplete'; snapshotIds: string[]; latestSnapshotId: string | null; items: ChecklistItem[]; gaps: { id: string; criterionKey: string; field: string; priority: number }[]; summary: string };
  instruction?: { status: 'ready' | 'not_needed' | 'unavailable'; witnessMessage?: string; reason?: string; gapId?: string; checklistRevision?: number };
};
export type Incident = { id: string; title: string; reportIds: string[] };
export type Dataset = { demo: boolean; referenceTime: string; reports: Report[]; incidents: Incident[]; sessions?: CaptureSession[] };
export type Filters = { area: string; period: 'all' | '24h' | '7d'; search: string };

export function displayPosition(report: Report) {
  const p = report.position;
  return p?.authorized && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 85.05112878 && Math.abs(p.longitude) <= 180 ? p : null;
}

export function filterReports(reports: Report[], filters: Filters, referenceTime: string, basis: 'receivedAt' | 'observedAt' = 'receivedAt', includeUndated = false) {
  const end = Date.parse(referenceTime);
  const duration = filters.period === '24h' ? 86400000 : filters.period === '7d' ? 604800000 : Infinity;
  const search = filters.search.trim().toLocaleLowerCase();
  return reports.filter(report => (filters.area === 'all' || report.area === filters.area)
    && (filters.period === 'all' || (!report[basis] ? includeUndated : Date.parse(report[basis]!) >= end - duration && Date.parse(report[basis]!) <= end))
    && `${report.id} ${report.description} ${report.area ?? ''}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => (b[basis] ? Date.parse(b[basis]!) : -Infinity) - (a[basis] ? Date.parse(a[basis]!) : -Infinity));
}

export function captureAnalysisState(report: Report) {
  const analyses = report.snapshot?.analyses;
  if (!analyses?.length) return 'Not supplied';
  const completed = analyses.filter(a => a.status === 'completed').length;
  return completed === analyses.length ? 'Completed' : completed ? 'Partial' : 'Unavailable';
}

export function captureSummary(reports: Report[]) {
  const assessed = reports.filter(r => r.snapshot?.analyses?.some(a => a.status === 'completed'));
  return {
    text: reports.length ? `${reports.length} ${reports.length === 1 ? "capture" : "captures"} available. ${assessed.length} ${assessed.length === 1 ? "includes" : "include"} completed AI assessments.` : 'No captures match this selection.',
    sources: assessed.map(r => r.id),
    unknown: 'An image assessment does not verify a fire or its location. Source independence is unknown.',
  };
}

export function bearingLabel(report: Report) {
  const heading = report.snapshot?.direction;
  return typeof heading === 'number' && Number.isFinite(heading) && heading >= 0 && heading < 360
    ? `${heading}° clockwise from north · Reference unknown` : 'Not provided';
}

export function matchingIncidents(incidents: Incident[], reports: Report[]) {
  const ids = new Set(reports.map(report => report.id));
  return incidents.filter(incident => incident.reportIds.some(id => ids.has(id)));
}

export function situationSummary(reports: Report[]) {
  if (!reports.length) return { text: 'No reports match this selection.', sources: [] as string[], unknown: 'Try another area, a wider receipt period, or a different search. An empty selection does not establish conditions on the ground.' };
  const smoke = reports.filter(report => report.claims.some(claim => claim.subject === 'Smoke' && claim.assessment === 'Reported'));
  const unresolved = ['Fire presence', 'source location'].filter(subject => reports.some(report => report.claims.some(claim => claim.subject.toLowerCase() === subject.toLowerCase() && claim.assessment === 'Unresolved')));
  return {
    text: smoke.length ? `Smoke has been reported in ${smoke.length} of the ${reports.length} matching reports.` : `${reports.length} matching ${reports.length === 1 ? 'report is' : 'reports are'} available. None includes a current claim assessment of reported smoke.`,
    sources: (smoke.length ? smoke : reports).map(report => report.id),
    unknown: unresolved.length ? `${unresolved.join(' and ').replace(/^./, c => c.toUpperCase())} ${unresolved.length === 1 ? 'remains' : 'remain'} unresolved in the available assessments.` : 'These records alone do not establish current fire conditions.',
  };
}

export function parseFilters(params: URLSearchParams, areas: string[]): Filters {
  const area = params.get('area') ?? 'all';
  const period = params.get('period');
  return { area: areas.includes(area) ? area : 'all', period: period === '24h' || period === '7d' ? period : 'all', search: '' };
}

export function validateDataset(value: unknown): Dataset {
  if (!value || typeof value !== 'object') throw new Error('The report data could not be read.');
  const data = value as Dataset;
  const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  if (data.demo !== true || !date(data.referenceTime) || !Array.isArray(data.reports) || !Array.isArray(data.incidents)) throw new Error('The report data has an unsupported format.');
  const ids = new Set<string>();
  for (const r of data.reports) {
    if (!r || typeof r.id !== 'string' || ids.has(r.id) || typeof r.title !== 'string' || typeof r.description !== 'string' || (r.area !== null && typeof r.area !== 'string') || (r.receivedAt !== null && !date(r.receivedAt)) || (r.observedAt !== null && !date(r.observedAt)) || (r.review !== null && typeof r.review !== 'string') || !Array.isArray(r.claims)) throw new Error('A report is incomplete or invalid.');
    ids.add(r.id);
    if (r.position !== null && (!r.position || typeof r.position.latitude !== 'number' || typeof r.position.longitude !== 'number' || typeof r.position.authorized !== 'boolean')) throw new Error('A report position is invalid.');
    for (const c of r.claims) if (!c || !['Smoke', 'Fire presence', 'Source location'].includes(c.subject) || !['Reported', 'Unresolved', 'Not reported'].includes(c.assessment) || typeof c.source !== 'string') throw new Error('A claim assessment is invalid.');
  }
  const incidentIds = new Set<string>();
  for (const i of data.incidents) {
    if (!i || typeof i.id !== 'string' || incidentIds.has(i.id) || typeof i.title !== 'string' || !Array.isArray(i.reportIds) || !i.reportIds.every(id => typeof id === 'string' && ids.has(id))) throw new Error('An incident reference is invalid.');
    incidentIds.add(i.id);
  }
  if (data.sessions) {
    const sessionIds = new Set<string>();
    for (const s of data.sessions) {
      if (!s.id || sessionIds.has(s.id) || !date(s.startedAt) || (s.endedAt !== null && !date(s.endedAt)) || !['active', 'ended'].includes(s.status)) throw new Error('A capture session is invalid.');
      sessionIds.add(s.id);
      if (s.checklist) {
        const belongs = (id: string) => data.reports.some(r => r.id === id && r.snapshot?.sessionId === s.id);
        if (!['complete', 'incomplete'].includes(s.checklist.verificationStatus) || !s.checklist.snapshotIds.every(belongs) || (s.checklist.latestSnapshotId !== null && !belongs(s.checklist.latestSnapshotId))) throw new Error('Invalid checklist sources.');
        for (const item of s.checklist.items) {
          if (!['resolved', 'uncertain', 'unavailable'].includes(item.status)) throw new Error('Invalid checklist state.');
          if (!Object.values(item.known).every(v => belongs(v.snapshotId) && (v.capturedAt === null || date(v.capturedAt))) || !item.observations.every(o => belongs(o.snapshotId)) || !item.unavailableSnapshotIds.every(belongs)) throw new Error('Invalid evidence source.');
        }
      }
    }
    for (const r of data.reports) {
      const s = r.snapshot;
      if (!s || !sessionIds.has(s.sessionId) || (s.direction !== null && (!Number.isFinite(s.direction) || s.direction < 0 || s.direction >= 360))) throw new Error('Invalid snapshot metadata.');
      if (s.analyses?.some(a => !a.criterionKey || !a.criterionName || !['completed', 'unavailable'].includes(a.status) || (a.status === 'completed' && !a.result))) throw new Error('Invalid image assessment.');
    }
  }
  return data;
}

// Explicit synthetic preview loader. Live data is handled separately by intelligence-live.ts.
export async function loadIntelligence(signal: AbortSignal, scenario = false): Promise<Dataset> {
  const response = await fetch(scenario ? '/data/intelligence-analysis.json' : '/data/intelligence-demo.json', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Reports could not be loaded (HTTP ${response.status}).`);
  return validateDataset(await response.json());
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(value)) + ' WIB';
}
