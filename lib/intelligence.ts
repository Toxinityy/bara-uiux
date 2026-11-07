export type Claim = { subject: 'Smoke' | 'Fire presence' | 'Source location'; assessment: 'Reported' | 'Unresolved' | 'Not reported'; source: string };
export type Report = {
  id: string; title: string; description: string; area: string | null;
  receivedAt: string; observedAt: string | null; review: string | null;
  position: { latitude: number; longitude: number; authorized: boolean } | null;
  claims: Claim[];
};
export type Incident = { id: string; title: string; reportIds: string[] };
export type Dataset = { demo: true; referenceTime: string; reports: Report[]; incidents: Incident[] };
export type Filters = { area: string; period: 'all' | '24h' | '7d'; search: string };

export function displayPosition(report: Report) {
  const p = report.position;
  return p?.authorized && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 85.05112878 && Math.abs(p.longitude) <= 180 ? p : null;
}

export function filterReports(reports: Report[], filters: Filters, referenceTime: string) {
  const end = Date.parse(referenceTime);
  const duration = filters.period === '24h' ? 86400000 : filters.period === '7d' ? 604800000 : Infinity;
  const search = filters.search.trim().toLocaleLowerCase();
  return reports.filter(report => (filters.area === 'all' || report.area === filters.area)
    && (filters.period === 'all' || (Date.parse(report.receivedAt) >= end - duration && Date.parse(report.receivedAt) <= end))
    && `${report.id} ${report.description} ${report.area ?? ''}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
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
    if (!r || typeof r.id !== 'string' || ids.has(r.id) || typeof r.title !== 'string' || typeof r.description !== 'string' || (r.area !== null && typeof r.area !== 'string') || !date(r.receivedAt) || (r.observedAt !== null && !date(r.observedAt)) || (r.review !== null && typeof r.review !== 'string') || !Array.isArray(r.claims)) throw new Error('A report is incomplete or invalid.');
    ids.add(r.id);
    if (r.position !== null && (!r.position || typeof r.position.latitude !== 'number' || typeof r.position.longitude !== 'number' || typeof r.position.authorized !== 'boolean')) throw new Error('A report position is invalid.');
    for (const c of r.claims) if (!c || !['Smoke', 'Fire presence', 'Source location'].includes(c.subject) || !['Reported', 'Unresolved', 'Not reported'].includes(c.assessment) || typeof c.source !== 'string') throw new Error('A claim assessment is invalid.');
  }
  const incidentIds = new Set<string>();
  for (const i of data.incidents) {
    if (!i || typeof i.id !== 'string' || incidentIds.has(i.id) || typeof i.title !== 'string' || !Array.isArray(i.reportIds) || !i.reportIds.every(id => typeof id === 'string' && ids.has(id))) throw new Error('An incident reference is invalid.');
    incidentIds.add(i.id);
  }
  return data;
}

// shortcut: synthetic read-only source; replace this adapter when a supported service contract exists.
export async function loadIntelligence(signal: AbortSignal): Promise<Dataset> {
  const response = await fetch('/data/intelligence-demo.json', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Reports could not be loaded (HTTP ${response.status}).`);
  return validateDataset(await response.json());
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(value)) + ' WIB';
}
