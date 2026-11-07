import type { CaptureSession, Report } from './intelligence.ts';
import { evidenceConfidence, type ConfidenceLevel, type EvidenceConfidence } from './evidence-confidence.ts';

export const confidenceLevels: ConfidenceLevel[] = ['High', 'Moderate', 'Low', 'No confirmed criteria', 'Not assessed'];
export const confidenceColors: Record<ConfidenceLevel, string> = {
  High: '#0f9d82',
  Moderate: '#d99a18',
  Low: '#e7653b',
  'No confirmed criteria': '#64748b',
  'Not assessed': '#8b5cf6',
};

// Always use the complete saved session checklist; map/list filters must not
// recalculate confidence from whichever captures happen to remain visible.
export function createSessionConfidenceMap(sessions: readonly CaptureSession[] = []): Map<string, EvidenceConfidence> {
  return new Map(sessions.map(session => [session.id, evidenceConfidence(session)]));
}

export function reportConfidence(report: Report, sessions: readonly CaptureSession[] = []): EvidenceConfidence {
  return evidenceConfidence(sessions.find(session => session.id === report.snapshot?.sessionId));
}

export function filterReportsByConfidence(reports: readonly Report[], sessions: readonly CaptureSession[], levels: readonly ConfidenceLevel[]): Report[] {
  const allowed = new Set(levels);
  const scores = createSessionConfidenceMap(sessions);
  return reports.filter(report => allowed.has(scores.get(report.snapshot?.sessionId ?? '')?.level ?? 'Not assessed'));
}
