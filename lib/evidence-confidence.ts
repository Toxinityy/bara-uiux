import type { CaptureSession, ChecklistItem } from './intelligence.ts';

// Version 1 measures session evidence coverage, not a probability of fire.
// Keep the denominator fixed so missing criteria cannot increase the score.
export const confidenceCriteria = [
  { key: 'visible_flames', name: 'Visible flames' },
  { key: 'smoke_visibility_color_origin', name: 'Visible smoke' },
  { key: 'forest_woodland_fire', name: 'Forest or woodland fire' },
  { key: 'visibly_burning_material', name: 'What is burning' },
  { key: 'fire_suppression', name: 'Firefighting activity' },
] as const;

export type ConfidenceLevel = 'Not assessed' | 'No confirmed criteria' | 'Low' | 'Moderate' | 'High';
export type ConfidenceCriterion = {
  key: string;
  name: string;
  status: ChecklistItem['status'] | 'unassessed';
  qualifies: boolean;
  reason: string;
};
export type EvidenceConfidence = {
  score: number | null;
  level: ConfidenceLevel;
  confirmed: number;
  total: number;
  criteria: ConfidenceCriterion[];
  explanation: string;
};

const unknownValues = new Set(['UNKNOWN', 'UNCERTAIN', 'UNAVAILABLE', 'NOT_DETERMINABLE', 'NOT_APPLICABLE']);
function meaningful(value: unknown): boolean {
  if (typeof value === 'string') return !!value.trim() && !unknownValues.has(value.trim().toUpperCase());
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(meaningful);
  if (value && typeof value === 'object') return Object.values(value).some(meaningful);
  return false;
}

function supported(item: ChecklistItem, sources: Set<string>): boolean {
  return Object.values(item.known ?? {}).some(source => source && sources.has(source.snapshotId) && meaningful(source.value));
}

export function evidenceConfidence(session?: Pick<CaptureSession, 'checklist'> | null): EvidenceConfidence {
  const checklist = session?.checklist;
  const sources = new Set(checklist?.snapshotIds ?? []);
  const criteria: ConfidenceCriterion[] = confidenceCriteria.map(definition => {
    const matches = checklist?.items.filter(item => item.criterionKey === definition.key) ?? [];
    if (!matches.length) return { ...definition, status: 'unassessed', qualifies: false, reason: 'Not assessed yet.' };
    // Conflicting or duplicated definitions are not independent confirmation.
    if (matches.length !== 1) return { ...definition, status: 'uncertain', qualifies: false, reason: 'Duplicate criterion records need review.' };
    const item = matches[0];
    const qualifies = item.status === 'resolved' && supported(item, sources);
    return {
      ...definition, status: item.status, qualifies,
      reason: qualifies ? 'Confirmed by the session checklist with supporting capture evidence.'
        : item.status === 'resolved' ? 'No supporting known value is linked to this session.'
          : item.status === 'unavailable' ? 'Assessment unavailable.' : 'More evidence is needed.',
    };
  });
  const confirmed = criteria.filter(item => item.qualifies).length;
  const total = confidenceCriteria.length;
  const score = checklist ? Math.round(confirmed / total * 100) : null;
  const level: ConfidenceLevel = score === null ? 'Not assessed' : score === 0 ? 'No confirmed criteria'
    : score < 40 ? 'Low' : score < 80 ? 'Moderate' : 'High';
  return {
    score, level, confirmed, total, criteria,
    explanation: 'Each confirmed criterion contributes 20 points. This measures evidence coverage across the session, not the probability, severity, or current presence of a fire. Camera-to-fire distance is excluded.',
  };
}
