import type { Dataset } from './intelligence';

export type DemoAction = { incidentId: string; reportId?: string; kind: 'accept' | 'reject' | 'remove' | 'review'; reason: string; status?: string; at: string };
// Explicit authored suggestion, not a geographic or AI matching heuristic.
export const suggestions = [{ incidentId: 'DEMO-INC-01', reportId: 'DEMO-004', rationale: 'Synthetic review exercise: compare two descriptions of a grey plume. The areas and observation dates differ; a shared source is not established.' }];

export function applyDemoActions(data: Dataset, actions: DemoAction[]): Dataset {
  return { ...data, incidents: data.incidents.map(incident => {
    let reportIds = [...incident.reportIds];
    for (const action of actions.filter(a => a.incidentId === incident.id)) {
      if (action.kind === 'accept' && action.reportId && data.reports.some(r => r.id === action.reportId) && !reportIds.includes(action.reportId)) reportIds.push(action.reportId);
      if (action.kind === 'remove') reportIds = reportIds.filter(id => id !== action.reportId);
    }
    return { ...incident, reportIds };
  }) };
}

export function needsReassessment(actions: DemoAction[], incidentId: string) {
  return actions.some(a => a.incidentId === incidentId && (a.kind === 'accept' || a.kind === 'remove'));
}
